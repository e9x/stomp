import { TOMP } from '../TOMP.mjs';
import { PublicDir } from './Compiler.mjs';
import { Process } from './Send.js';
import messages from '../Messages.mjs'
import serveStatic from 'serve-static';

export class Server {
	constructor(config = {}){
		this.tomp = new TOMP(config);
		this.static = serveStatic(PublicDir, {
			setHeaders: (res, path, stat) => {
				res.setHeader('service-worker-allowed', this.tomp.prefix);
			}
		});
		
		this.request = this.request.bind(this);
		this.upgrade = this.upgrade.bind(this);
	}
	upgrade(req, socket, head){
		socket.end();
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
	async request(request, response){
		if(!request.url.startsWith(this.tomp.prefix)){
			this.send_json(response, 500, { message: messages['generic.exception.request'] });
			throw new Error('Your server is misconfigured! TOMPServer should only run on its specified prefix.');
		}
		
		var finished = false;

		response.on('finish', () => finished = true);
		
		response.on('error', error => {
			this.tomp.log.error(error);
		});


		try{
			if(request.url == this.tomp.prefix){
				return void await Process(this, request, response);
			}else if(request.url.startsWith(this.tomp.prefix + 'about:/]/static/')){
				request.url = request.url.substr((this.tomp.prefix + 'about:/]/static').length);
				return void await this.static(request, response, err => {
					if(err)this.tomp.log.error(err);
					this.send_json(response, 404, { message: messages['error.notfound'] })
				});
			}else{
				return void await this.send_json(response, 404, { message: messages['error.unknownservice']});
			}
		}catch(err){
			setTimeout(async () => {
				this.tomp.log.error(err);
				if(!finished)return void await this.send_json(response, 500, { message: messages['generic.exception.request'] });
			});
		}
	}
};

export * from '../Codec.mjs';
export * from '../Logger.mjs';