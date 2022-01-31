import { TOMP } from '../TOMP.mjs';
import { Process } from './Process.mjs';
import { SendBinary, SendForm, SendHTML, SendJS, SendCSS, SendManifest } from './Send.mjs';
import messages from '../Messages.mjs'
import { openDB } from 'idb/with-async-ittr';
import {create_db as create_cookie_db} from './Cookies.mjs';
import { SyncRequest } from './SyncRequest.mjs';

export class Server {
	constructor(config){
		this.tomp = new TOMP(config);
		this.request = this.request.bind(this);
		this.ready = this.work();

		this.sync_request = new SyncRequest(this);
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
			},
		});
	}
	send_json(status, json){
		this.tomp.log.trace(json);
		
		return new Response(JSON.stringify(json), {
			status,
			headers: {
				'content-type': 'application/json',
			},
		});
	}
	async send(request, service, field){
		try{
			switch(service){
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
			}
		}catch(err){
			this.tomp.log.error(err);
			return this.send_json(500, { message: messages['generic.exception.request'] });
		}
	}
	request(event){
		const request = event.request;
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
