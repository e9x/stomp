import { engine } from '../UserAgent.mjs';
import { Reflect } from './RewriteUtil.mjs';

export class SyncRequest {
	static xml_open = XMLHttpRequest.prototype.open;
	constructor(client){
		this.client = client;
	}
	work(){}
	create_response(data){
		console.log('Received:', data);
		const response = new Response(data[0], data[1]);
		response.responseText = data[2];
		return response;
	}
	request(request){
		const args = [
			request.url,
			{
				headers: request.headers,
				method: request.method,
				body: request.body,
				cache: request.cache,
				referrer: request.referrer,
			},
		];

		if(engine == 'gecko'){
			const http = new XMLHttpRequest();

			Reflect.apply(SyncRequest.xml_open, http, [ 'POST', `${this.client.tomp.directory}worker:sync-request/`, false ]);
			http.send(JSON.stringify(args));
			
			return this.create_response(JSON.parse(http.responseText));
		}

		const cookieopt = `; path=${this.client.tomp.directory}`;
		const id = 'sync-request-' + Math.random().toString(16).slice(2);
		const regex = new RegExp(`${id}=(.*?)(;|$)`);
		
		document.cookie = `${id}=${encodeURIComponent(JSON.stringify([ 'outgoing', args ]))}${cookieopt}`;
		
		let name;
		let data;
		
		while(true){
			const value = document.cookie.match(regex)[1];
			
			if(!value)continue;
			
			[name,data] = JSON.parse(decodeURIComponent(value));
			
			if(name == 'incoming')break;
		}
		
		document.cookie = `${id}=${cookieopt}`;

		return this.create_response(data);
	}
};