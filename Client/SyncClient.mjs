import { decode_base64, encode_base64 } from '../Base64.mjs';
import { global } from '../Global.mjs';
import { engine } from '../UserAgent.mjs';
import { Reflect } from './RewriteUtil.mjs';

const { Request } = global;

const xml_open = XMLHttpRequest.prototype.open;

export class SyncClient {
	constructor(client){
		this.client = client;
	}
	encoder = new TextEncoder('utf-8');
	work(){}
	create_response([ error, base64ArrayBuffer, init ]){
		if(error !== null){
			throw new TypeError(error);
		}
		
		const { buffer: rawArrayBuffer } = decode_base64(base64ArrayBuffer);

		const response = new Response(rawArrayBuffer, init);

		response.rawArrayBuffer = rawArrayBuffer;

		return response;
	}
	fetch(url, init){
		const request = new Request(url, init);
		
		const options = {	
			method: request.method,
			cache: request.cache,
			referrer: request.referrer,
		};

		if(init.headers instanceof Headers){
			options.headers = Object.fromEntries(init.headers.entries());
		}else if(typeof init.headers === 'object' && init.headers !== null){
			options.headers = init.headers;
		}else{
			options.headers = {};
		}

		let body;

		if(init.body instanceof ArrayBuffer){
			body = encode_base64(init.body);
		}else if(typeof init.body == 'string'){
			body = encode_base64(this.encoder.encode(init.body));
		}

		const args = [
			request.url,
			options,
			body,
		];

		if(engine == 'gecko'){
			const http = new XMLHttpRequest();

			Reflect.apply(xml_open, http, [ 'POST', `${this.client.tomp.directory}worker:sync-request/`, false ]);
			http.send(JSON.stringify(args));
			
			return this.create_response(JSON.parse(http.responseText));
		}
		
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