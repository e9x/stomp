import { TOMP } from '../TOMP.mjs';
import { Process } from './Process.mjs';
import { SendCookieStore, SendGetCookies, SendSetCookies, SendBinary, SendForm, SendHTML, SendSVG, SendJS, SendCSS, SendManifest, SendStorage } from './Send.mjs';
import { openDB } from 'idb/with-async-ittr';
import { create_db as create_cookie_db } from './Cookies.mjs';
import { create_db as create_storage_db } from './Storage.mjs';
import { SyncServer } from './SyncServer.mjs';
import { BareError } from './Bare.mjs';

export class Server {
	session = Math.random();
	constructor(config){
		this.tomp = new TOMP(config);
		this.request = this.request.bind(this);
		this.ready = this.work();

		this.sync_request = new SyncServer(this);
		this.sync_request.work();
	}
	async work(){
		this.db = await openDB('tomp', 1, {
			upgrade: (db, oldv, newv, transaction) => {
				/*const consts = db.createObjectStore('consts', {
					keyPath: 'name',
				});
				
				consts.createIndex('name', 'name');*/
				
				create_cookie_db(db);
				create_storage_db(db);
			},
		});
	}
	json(status, json){
		// this.tomp.log.trace(json);
		
		return new Response(JSON.stringify(json, null, '\t'), {
			status,
			headers: {
				'content-type': 'application/json',
			},
		});
	}
	async send(request, service, field){
		try{
			switch(service){
				case'worker:get-cookies':
					return await SendGetCookies(this, request, field)
					break;
				case'worker:set-cookies':
					return await SendSetCookies(this, request, field)
					break;
				case'worker:cookiestore':
					return await SendCookieStore(this, request, field)
					break;
				case'worker:storage':
					return await SendStorage(this, request, field)
					break;
				case'worker:sync-request':
					return await this.sync_request.route(request);
					break;
				case 'worker:process':
					return await Process(this, request, field);
					break;
				case 'worker:binary':
					return await SendBinary(this, request, field)
					break;
				case 'worker:form':
					return await SendForm(this, request, field)
					break;
				case 'worker:html':
					return await SendHTML(this, request, field);
					break;
				case 'worker:svg':
					return await SendSVG(this, request, field);
					break;
				case 'worker:js':
					return await SendJS(this, request, field);
					break;
				case 'worker:wjs':
					return await SendJS(this, request, field, true);
					break;
				case 'worker:js:module':
					return await SendJS(this, request, field, true);
					break;
				case 'worker:css':
					return await SendCSS(this, request, field);
					break;
				case 'worker:manifest':
					return await SendManifest(this, request, field);
					break;
				default:
					throw new BareError(400, {
						code: 'IMPL_UNKNOWN_SERVICE',
						id: 'request',
						message: `Unknown service ${service}`,
					});
					break;
			}
		}catch(err){
			let status;
			let json;
			let type;

			if(err instanceof Error){
				if(err instanceof BareError){
					type = 'bare';
					status = err.status;
					json = err.body;
				}else{
					
					type = 'exception';
					status = 500;
					json = {
						code: 'UNKNOWN',
						id: `error.${err.name}`,
						message: err.message,
						stack: err.stack,
					};
					this.tomp.log.error(err);
				}		
			}else{
				type = 'message';
				status = 500;
				json = {
					code: 'UNKNOWN',
					id: 'unknown',
					message: err,
					stack: new Error(err).stack,
				};
			}

			if(request.destination === 'document'){
				return new Response(`<!DOCTYPE HTML>
<html>
	<head>
		<meta charset='utf-8' />
		<title>Error</title>
	</head>
	<body>
		<h1>An error occurred. (${status})</h1>
		<hr />
		<p>Code: ${json.code}</p>
		<p>ID: ${json.id}</p>
		<p>Message: ${err.message}</p>
		${err.stack ? '<p>Stack trace:</p><pre>' + err.stack + '</pre>' : ''}
		<script>
const json = ${JSON.stringify(json)};
const error = new Error(json.message);
error.name = json.id;
error.code = json.code;
if(json.stack){
	error.stack = json.stack;
}
console.error(error);
		</script>
	</body>
</html>`, {
					status,
					headers: {
						'content-type': 'text/html',
					},
				})	
			}else{
				return this.json(status, json);
			}
		}
	}
	request(event){
		const { request } = event;
		let url = request.url.slice(request.url.indexOf(this.tomp.directory));
		
		const hash = url.indexOf('#');
		
		if(hash != -1){
			url = url.slice(0, hash);
		}

		const {service,field} = this.tomp.url.get_attributes(url);
		
		if(service.startsWith('worker:')){
			event.respondWith(this.send(request, service, field));
			return true;
		}

		return false;
	}
};
