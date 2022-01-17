import { TOMP } from '../TOMP.mjs';
import { Process } from './Process.mjs';
import { SendBinary, SendForm, SendHTML, SendJS, SendCSS, SendManifest } from './Send.mjs';
import messages from '../Messages.mjs'
import cookie from 'cookie';

export class Server {
	constructor(config = {}){
		this.tomp = new TOMP(config);
		this.request = this.request.bind(this);
	}
	async work(){
		var key = await cookieStore.get('tomp$key', {
			url: '/tomp/',
		});

		if(!key)key = this.tomp.codec.generate_key();

		await cookieStore.set('tomp$key', key, {
			path: this.tomp.prefix,
			expires: Date.now() * 2,
		});
		
		this.key = key;
	}
	send_json(status, json){
		this.tomp.log.trace(json);
		
		return new Response(JSON.stringify(json), {
			headers: {
				'content-type': 'application/json',
			},
		});
	}
	get_attributes(url){
		const path = url.substr(this.tomp.prefix.length);
		
		const queryind = path.indexOf(']/', 1);
		const serviceind = path.indexOf('/', queryind + 2);

		if(queryind == -1 || serviceind == -1){
			throw { message: messages['error.badurl'] };
		}

		return {
			service: path.slice(queryind + 2, serviceind),
			query: path.slice(0, queryind),
			field: path.slice(serviceind),
		};
	}
	async request(request){
		const url = request.url.slice(request.url.indexOf(this.tomp.prefix));
		
		try{
			var {service,query,field} = this.get_attributes(url);
		}catch(err){
			return this.send_json(response, 400, err);
		}
		
		// this.log.debug({ service, query, field });
		
		try{
			switch(service){
				case 'process':
					return await Process(this, request);
					break;
				case 'binary':
					return await SendBinary(this, request, query, field)
					break;
				case 'form':
					return await SendForm(this, request, query, field)
					break;
				case 'html':
					return await SendHTML(this, request, query, field);
					break;
				case 'js':
					return await SendJS(this, request, query, field);
					break;
				case 'css':
					return await SendCSS(this, request, query, field);
					break;
				case 'manifest':
					return await SendManifest(this, request, query, field);
					break;
				default:
					return this.send_json(404, { message: messages['error.unknownservice']});
					break;
			}
		}catch(err){
			this.tomp.log.error(err);
			return this.send_json(500, { message: messages['generic.exception.request'] });
		}
	}
};
