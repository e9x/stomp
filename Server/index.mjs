import { Logger, LOG_WARN } from '../Logger.mjs';
import { SendBare } from './Send.mjs';
import messages from '../Messages.mjs';

export class Server {
	prefix = '';
	loglevel = LOG_WARN;
	constructor(config = {}){
		if(typeof config.prefix != 'string'){
			throw new Error('Prefix must be specified.')
		}

		this.prefix = config.prefix;

		if(typeof config.loglevel == 'number'){
			this.loglevel = config.loglevel;
		}

		this.log = new Logger(this.loglevel);
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
		
		// this.tomp.log.trace(json);

		response.end(send);
	}
	route_request(request, response){
		console.log(this.prefix);
		if(request.url.startsWith(this.prefix)){
			this.request(request, response);
			return true;
		}else{
			return false;
		}
	}
	async request(request, response){
		let finished = false;

		response.on('finish', () => finished = true);
		
		response.on('error', error => {
			this.log.error(error);
		});

		try{
			return void await SendBare(this, request, response);
		}catch(err){
			setTimeout(async () => {
				this.log.error(err);
				if(!finished)return void await this.send_json(response, 500, { message: messages['generic.exception.request'] });
			});
		}
	}
};