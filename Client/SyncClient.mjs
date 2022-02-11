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
		response.responseText = data[0];
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

		const cookieopt = ``;
		const id = 'sync-request-' + Math.random().toString(16).slice(2);
		const regex = new RegExp(`${id}=(.*?)(;|$)`);
		
		this.client.cookie.value = `${id}=${encodeURIComponent(JSON.stringify([ 'outgoing', args ]))}; path=${this.client.tomp.directory}; max-age=10`;
		
		let name;
		let data;
		let cycles;

		for(cycles = 1e4; cycles > 0; cycles--){
			const match = this.client.cookie.value.match(regex);
			
			if(!match)continue;
			
			const [,value] = match;

			[name,data] = JSON.parse(decodeURIComponent(value));
			
			if(name == 'incoming')break;
		}

		if(!cycles){
			this.client.log.error('Used max cycles when requesting', url);
		}
		
		this.client.cookie.value = `${id}=; path=${this.client.tomp.directory}; expires=${new Date(0)}`;

		return this.create_response(data);
	}
};