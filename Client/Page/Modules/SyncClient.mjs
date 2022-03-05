import { decode_base64, encode_base64 } from '../../../Base64.mjs';
import global from '../../global.mjs';
import { engine } from '../../environment.mjs';
import { decodeCookie } from '../../../encodeCookies.mjs';
import { status_empty } from '../../../Worker/bare.mjs';
import { Reflect } from '../../RewriteUtil.mjs';
import CookieRewrite from './Cookie.mjs'

const { Request, XMLHttpRequest } = global;

const { serviceWorker } = navigator;

export class SyncClient {
	constructor(client){
		this.client = client;
	}
	encoder = new TextEncoder('utf-8');
	work(){}
	create_response([ error, base64ArrayBuffer, init, url ]){
		if(error !== null){
			throw new TypeError(error.message);
		}
		
		const { buffer: rawArrayBuffer } = decode_base64(base64ArrayBuffer);

		let response;
		
		if(!init){
			console.error('no init');
			debugger;
		}

		if(status_empty.includes(init.status)){
			response = new Response(undefined, init);
		}else{
			response = new Response(rawArrayBuffer, init);
		}

		Reflect.defineProperty(response, 'url', {
			value: url,
		});
		response.rawArrayBuffer = rawArrayBuffer;

		return response;
	}
	fetch(url, init = {}){
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

		let body = undefined;

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

			http.open('POST', `${this.client.tomp.directory}sync-request/`, false);
			http.send(JSON.stringify(args));
			
			return this.create_response(JSON.parse(http.responseText));
		}
		
		const id = 'sync-request-' + Math.random().toString(16).slice(2);
		const regex = new RegExp(`${id}=(.*?)(;|$)`);

		serviceWorker.controller.postMessage({
			tomp: true,
			sync: true,
			id,
			args,
		});

		let cookie_count;
		let cycles;

		for(cycles = 1e5; cycles > 0; cycles--){
			const match = this.client.get(CookieRewrite).value.match(regex);
			
			if(!match)continue;
			
			const [,value] = match;

			cookie_count = parseInt(value);

			this.client.get(CookieRewrite).value = `${id}=; path=/; expires=${new Date(0)}`;
		
			break;
		}

		if(!cycles){
			throw new RangeError(`Used max cycles when requesting ${url}`);
		}
		
		let data = '';

		for(let i = 0; i < cookie_count; i++){
			const regex = new RegExp(`${id}${i}=(.*?)(;|$)`);
			const match = this.client.get(CookieRewrite).value.match(regex);
			
			if(!match){
				console.warn(`Couldn't find chunk ${i}`);
				continue;
			}

			this.client.get(CookieRewrite).value = `${id}${i}=; path=/; expires=${new Date(0)}`;
		
			const [,value] = match;

			data += value;
		}

		return this.create_response(JSON.parse(decodeCookie(data)));
	}
};