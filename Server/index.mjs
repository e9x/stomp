import { TOMP } from '../TOMP.mjs';
import { Static } from './Compiler.mjs';
import { Process } from './Process.mjs';
import cookie from 'cookie';

export class Server {
	constructor(config = {}){
		this.tomp = new TOMP(config);
		this.request = this.request.bind(this);
		this.upgrade = this.upgrade.bind(this);
	}
	upgrade(req, socket, head){

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
		response.write(send);
		response.end();
	}
	request(request, response){
		if(!request.url.startsWith(this.tomp.prefix)){
			const error = new Error('Your server is misconfigured! TOMPServer should only run on its specified prefix.');
			this.send_json(response, 502, { error: error.message })
			throw error;
		}

		var path = request.url.substr(this.tomp.prefix.length);
		var service;
		
		let ind = path.indexOf('/', 1);

		if(ind == -1){
			service = path;
		}else{
			service = path.substr(0, ind);
		}

		const field = path.substr(service.length + 1);

		console.log(path, field, service);

// http://[::1]/tomp/html/%C3%8Dttps%3A%2F%2F%C3%92ww.goog%C3%89e.com%2Fs%C3%80arch%3Fq%3D%C3%9Crdy
// 

		switch(service){
			case 'process':
				return void Process(this, request, response);
				break;
			case 'static':
				return void Static(request, response);
				break;
			case 'html':
				console.log(service, field, this.get_key(request), this.tomp.wrap.unwrap(decodeURIComponent(field), this.get_key(request)));
				const url = this.tomp.wrap.unwrap(decodeURIComponent(field), this.get_key(request));

				console.log('Proxy:', url);

				break;
		}
		
		this.send_json(response, 404, { message: 'Not found' });
	}
};

export * from '../Wrap.mjs';