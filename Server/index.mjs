import { TOMP } from '../TOMP.mjs';
import { Static } from './Compiler.mjs';
import { Process } from './Process.mjs';
import { SendBinary, SendHTML, SendScript } from './Send.mjs';
import cookie from 'cookie';

export class Server {
	messages = {
		'generic.error.notready': `Endpoint not ready`,
		'generic.exception.request': `'TOMPServer encountered an exception while handling your request. Contact this server's administrator.`,
		'error.unknownservice': `Service not found`,
	};
	constructor(config = {}){
		this.tomp = new TOMP(config);
		this.request = this.request.bind(this);
		this.upgrade = this.upgrade.bind(this);
	}
	upgrade(req, socket, head){
		socket.end();
	}
	get_key(request){
		const cookies = typeof request.headers.cookie == 'string' ? cookie.parse(request.headers.cookie) : {};
		return cookies.tomp$key;
	}
	send_json(response, status, json){
		const send = Buffer.from(JSON.stringify(json));
		response.writeHead(status, { 
			'content-type': 'application/json',
			'content-length': send.byteLength,
		});
		
		// this.tomp.log.trace.trace(json);

		response.write(send);
		response.end();
	}
	async request(request, response){
		if(!request.url.startsWith(this.tomp.prefix)){
			this.send_json(response, 500, { message: this.messages['generic.exception.request'] });
			throw new Error('Your server is misconfigured! TOMPServer should only run on its specified prefix.');
		}

		response.on('error', error => {
			this.tomp.log.error(error);
		});

		var finished = false;

		response.on('finish', () => finished = true);
		
		var path = request.url.substr(this.tomp.prefix.length);
		var service;
		
		let ind = path.indexOf('/', 1);

		if(ind == -1){
			service = path;
		}else{
			service = path.substr(0, ind);
		}

		const field = path.substr(service.length + 1);
		
		try{
			switch(service){
				case 'process':
					return void await Process(this, request, response);
					break;
				case 'script':
					return void await SendScript(this, request, response);
					break;
				case 'static':
					return void await Static(request, response);
					break;
				case 'binary':
					return void await SendBinary(this, request, response, field)
					break;
				case 'html':
					return void await SendHTML(this, request, response, field);
					break;
				default:
					return void await this.send_json(response, 404, { message: this.messages['error.unknownservice']});
					break;
			}
		}catch(err){
			setTimeout(async () => {
				this.tomp.log.error(err);
				if(!finished)return void await this.send_json(response, 500, { message: this.messages['generic.exception.request'] });
			});
		}
	}
};

export * from '../Wrap.mjs';
export * from '../Logger.mjs';