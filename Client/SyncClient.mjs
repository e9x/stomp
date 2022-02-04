import { global } from '../Global.mjs';
import { engine } from '../UserAgent.mjs';
import { Reflect } from './RewriteUtil.mjs';

const { Request } = global;

const xml_open = XMLHttpRequest.prototype.open;

export class SyncClient {
	constructor(client){
		this.client = client;
	}
	work(){}
	create_response(data){
		// console.log('Received:', data);
		const response = new Response(data[0], data[1]);
		response.responseText = data[2];
		return response;
	}
	fetch(url, init){
		const request = new Request(url, init);
		
		const args = [
			request.url,
			{
				headers: Object.fromEntries(request.headers),
				method: request.method,
				body: request.body,
				cache: request.cache,
				referrer: request.referrer,
			},
		];

		if(engine == 'gecko'){
			const http = new XMLHttpRequest();

			Reflect.apply(xml_open, http, [ 'POST', `${this.client.tomp.directory}worker:sync-request/`, false ]);
			http.send(JSON.stringify(args));
			
			return this.create_response(JSON.parse(http.responseText));
		}

		const cookieopt = `; path=${this.client.tomp.directory}`;
		const id = 'sync-request-' + Math.random().toString(16).slice(2);
		const regex = new RegExp(`${id}=(.*?)(;|$)`);
		
		this.client.cookie.value = `${id}=${encodeURIComponent(JSON.stringify([ 'outgoing', args ]))}${cookieopt}`;
		
		let name;
		let data;
		
		while(true){
			const [,value] = this.client.cookie.value.match(regex);
			
			if(!value)continue;
			
			[name,data] = JSON.parse(decodeURIComponent(value));
			
			if(name == 'incoming')break;
		}
		
		this.client.cookie.value = `${id}=${cookieopt}; expires=` + new Date(0);

		return this.create_response(data);
	}
};