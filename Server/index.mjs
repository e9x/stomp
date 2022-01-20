import { TOMP } from '../TOMP.mjs';
import { PublicDir } from './Compiler.mjs';
import { SendBare } from './Send.mjs';
import messages from '../Messages.mjs';
import serveStatic from 'serve-static';
import cookie from 'cookie';

export class Server {
	constructor(config = {}){
		this.tomp = new TOMP(config);
		this.static = serveStatic(PublicDir);
		
		this.request = this.request.bind(this);
		this.upgrade = this.upgrade.bind(this);
	}
	get bootstrapper(){
		return `${this.tomp.prefix}bootstrapper.js`;
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

		response.end(send);
	}
	async request(request, response){
		if(!request.url.startsWith(this.tomp.prefix)){
			this.send_json(response, 500, { message: messages['generic.exception.request'] });
			throw new Error('Your server is misconfigured! TOMPServer should only run on its specified prefix.');
		}
		
		let finished = false;

		response.on('finish', () => finished = true);
		
		response.on('error', error => {
			this.tomp.log.error(error);
		});
		
		const {service,field} = this.tomp.url.get_attributes(request.url);
		
		try{
			
			switch(service){
				case'server:bare':
					return void await SendBare(this, request, response, field);
					break;
				case'server:config':
					const send = Buffer.from(JSON.stringify(this.tomp));
					response.writeHead(200, {
						'content-type': 'application/javascript',
						'content-length': send.length,
					});
					response.end(send);
					break;
				default:
					request.url = request.url.slice(this.tomp.prefix.length);
					return void await this.static(request, response, err => {
						if(err)this.tomp.log.error(err);
						this.send_json(response, 404, { message: messages['generic.error.notfound'] })
					});			
					// return void await this.send_json(response, 404, { message: messages['error.unknownservice']});
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

export * from '../Codec.mjs';
export * from '../Logger.mjs';