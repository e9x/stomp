import { TOMP } from '../TOMP.mjs';
import { Process } from './Process.mjs';
import { SendBinary, SendForm, SendHTML, SendJS, SendCSS, SendManifest } from './Send.mjs';
import { messages } from '../Messages.mjs'
import cookie from 'cookie';

export class Server {
	constructor(config = {}){
		this.tomp = new TOMP(config);
		this.request = this.request.bind(this);
	}
	get_key(request){
		const cookies = typeof request.headers.cookie == 'string' ? cookie.parse(request.headers.cookie) : {};
		return cookies.tomp$key;
	}
	get_setcookie(key){
		return cookie.serialize('tomp$key', key, {
			maxAge: 60 * 60 * 2, // 2 hours
			path: this.tomp.prefix,
		});
	}
	send_json(response, status, json){
		const send = Buffer.from(JSON.stringify(json));
		response.writeHead(status, { 
			'content-type': 'application/json',
			'content-length': send.byteLength,
		});
		
		this.tomp.log.trace(json);

		response.write(send);
		response.end();
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
	async request(request, response){
		if(!request.url.startsWith(this.tomp.prefix)){
			this.send_json(response, 500, { message: messages['generic.exception.request'] });
			throw new Error('Your server is misconfigured! TOMPServer should only run on its specified prefix.');
		}

		response.on('error', error => {
			this.tomp.log.error(error);
		});

		var finished = false;

		response.on('finish', () => finished = true);
		
		try{
			var {service,query,field} = this.get_attributes(request.url);
		}catch(err){
			return void this.send_json(response, 400, err);
		}
		
		// this.log.debug({ service, query, field });

		try{
			switch(service){
				case 'process':
					return void await Process(this, request, response);
					break;
				case 'static':
					request.url = field;
					return void await Static(request, response, err => {
						if(err)this.tomp.log.error(err);
						this.send_json(response, 500, { message: messages['exception.nostatic'] })
					});
					break;
				case 'binary':
					return void await SendBinary(this, request, response, query, field)
					break;
				case 'form':
					return void await SendForm(this, request, response, query, field)
					break;
				case 'html':
					return void await SendHTML(this, request, response, query, field);
					break;
				case 'js':
					return void await SendJS(this, request, response, query, field);
					break;
				case 'css':
					return void await SendCSS(this, request, response, query, field);
					break;
				case 'manifest':
					return void await SendManifest(this, request, response, query, field);
					break;
				default:
					return void await this.send_json(response, 404, { message: messages['error.unknownservice']});
					break;
			}
		}catch(err){
			setTimeout(async () => {
				this.tomp.log.error(err);
				if(!finished)return void await this.send_json(response, 500, { message: messages['generic.exception.request'] });
			});
		}
	}
};
