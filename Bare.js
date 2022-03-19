// Implements the protocol for requesting bare data from a server
// See ../Server/Send.mjs

import { encodeProtocol } from './encodeProtocol.js';
import global from './global.js';

const hour = 60e3 * 60;

export const forbids_body = ['GET','HEAD'];
export const status_empty = [101,204,205,304];
export const status_redirect = [300,301,302,303,304,305,306,307,308];

import { openDB } from 'idb';
import { parse } from 'cache-control-parser';
import { mapHeaderNamesFromArray, rawHeaderNames } from './Worker/HeaderUtil.js';

const { fetch, WebSocket } = global;

export default class Bare {
	#open;
	constructor(tomp, server){
		this.tomp = tomp;
		this.server = server;

		this.ws_v1 = new URL(this.server + 'v1/', this.tomp.origin);
		this.http_v1 = new URL(this.server + 'v1/', this.tomp.origin);

		if(this.ws_v1.protocol === 'https:'){
			this.ws_v1.protocol = 'wss:';
		}else{
			this.ws_v1.protocol = 'ws:';
		}

		this.#open = this.#open_db();
	}
	async #open_db(){
		this.db = await openDB('bare', 1, {
			upgrade: (database, old_version, new_version, transaction) => {
				const cache = database.createObjectStore('cache', {
					keyPath: 'id',
				});

				cache.createIndex('etag', 'etag');
				cache.createIndex('expires', 'expires');
				cache.createIndex('lastModified', 'lastModified');
			}
		});
	}
	async connect(request_headers, protocol, host, port, path){
		const assign_meta = await fetch(`${this.server}v1/ws-new-meta`, { method: 'GET' });

		if(!assign_meta.ok){
			throw BareError(assign_meta.status, await assign_meta.json());
		}

		const id = await assign_meta.text();
		
		const socket = new WebSocket(this.ws_v1, [
			'bare',
			encodeProtocol(JSON.stringify({
				remote: {
					protocol,
					host,
					port,
					path,
				},
				headers: request_headers,
				forward_headers: [
					'accept-encoding',
					'accept-language',
					'sec-websocket-extensions',
					'sec-websocket-key',
					'sec-websocket-version',
				],
				id,
			})),
		]);

		socket.meta = new Promise((resolve, reject) => {
			socket.addEventListener('open', async () => {
				const outgoing = await fetch(`${this.server}v1/ws-meta`, {
					headers: {
						'x-bare-id': id,
					},
					method: 'GET',
				});

				if(!outgoing.ok){
					reject(new BareError(outgoing.status, await outgoing.json()));
				}

				resolve(await outgoing.json());
			});

			socket.addEventListener('error', reject);
		});

		return socket;
	}
	async fetch(method, request_headers, body, protocol, host, port, path, cache){
		if(protocol.startsWith('blob:')){
			const response = await fetch(`blob:${location.origin}${path}`);
			response.json_headers = Object.fromEntries(response.headers.entries());
			response.raw_header_names = [];
			return response;
		}

		const bare_headers = {};

		if(request_headers instanceof Headers){
			for(let [ header, value ] of request_headers){
				bare_headers[header] = value;
			}
		}else{
			for(let header in request_headers){
				bare_headers[header] = request_headers[header];
			}
		}

		const forward_headers = ['accept-encoding', 'accept-language'];

		const options = {
			credentials: 'omit',
			method: method,
		};
	
		if(body !== undefined){
			options.body = body;
		}
		
		// bare can be an absolute path containing no origin, it becomes relative to the script	
		const request = new Request(new URL(this.server + 'v1/', location), options);
		
		const { status, statusText, headers, json_headers, raw_header_names, response_body } = await this.#fetch_cached(request, protocol, host, path, port, bare_headers, forward_headers, cache);
		
		let result;
		
		if(status_empty.includes(status)){
			result = new Response(undefined, {
				status,
				statusText,
				headers,
			});
		}else{
			result = new Response(response_body, {
				status,
				statusText,
				headers,
			});
		}
	
		result.json_headers = json_headers;
		result.raw_header_names = raw_header_names;
		
		return result;
	}
	#cache_expired(data){
		if(data.expires < new Date()){
			return true;
		}
	}
	async #write_bare_response(body, status, statusText, headers){
		return new Response(body, {
			headers: {
				'x-bare-status': status,
				'x-bare-status-text': statusText,
				'x-bare-headers': JSON.stringify(headers),
			}
		});
	}
	async #read_bare_response(response){
		if(!response.ok){
			throw new BareError(response.status, await response.json());
		}
		
		const status = parseInt(response.headers.get('x-bare-status'));
		const statusText = response.headers.get('x-bare-status-text');
		const raw_headers = JSON.parse(response.headers.get('x-bare-headers'));
		
		const headers = new Headers();
		const json_headers = {};
		const raw_header_names = [];
		
		for(let header in raw_headers){
			const lower = header.toLowerCase();
			const value = raw_headers[header];
			
			raw_header_names.push(header);
			json_headers[lower] = value;
			headers.set(lower, value);
		}

		return {
			status,
			statusText,
			raw_header_names,
			raw_headers,
			json_headers,
			headers,
			response_body: response.body,
		}
	}
	#write_bare_request(request, protocol, host, path, port, bare_headers, forward_headers){
		request.headers.set('x-bare-protocol', protocol);
		request.headers.set('x-bare-host', host);
		request.headers.set('x-bare-path', path);
		request.headers.set('x-bare-port', port);
		request.headers.set('x-bare-headers', JSON.stringify(bare_headers));
		request.headers.set('x-bare-forward-headers', JSON.stringify(forward_headers));
	}
	async #fetch_cached(request, protocol, host, path, port, bare_headers, forward_headers, cache){
		const destination_id = `${protocol}${host}:${port}${path}`;

		await this.#open;
		const { store } = this.db.transaction('cache', 'readwrite');
		const data = await store.get(destination_id);
		let bad_cache = cache === 'no-cache' || data === undefined || this.#cache_expired(data);
		let cache_valid = false;
		
		if(!bad_cache){
			const raw_names = rawHeaderNames(bare_headers);
			bare_headers = Object.fromEntries(new Headers(bare_headers));

			if('lastModified' in data){
				bare_headers['If-Modified-Since'] = data.lastModified;
			}

			if('etag' in data){
				bare_headers['If-None-Match'] = data.etag;
			}

			mapHeaderNamesFromArray(raw_names, bare_headers);
		}
		
		this.#write_bare_request(request, protocol, host, path, port, bare_headers, forward_headers);
		const response = await fetch(request);

		let response_data = await this.#read_bare_response(response);

		if(!bad_cache){
			console.log(data);
			console.log(response_data.headers.get('etag'), data.etag);
			console.log(new Date(response_data.headers.get('last-modified')).getTime(), data.lastModified?.getTime());
			
			if('etag' in data && response_data.headers.get('etag') === data.etag){
				cache_valid = true;
			}else if('lastModified' in data && new Date(response_data.headers.get('last-modified')).getTime() === data.lastModified.getTime()){
				cache_valid = true;
			}
		}

		if(response_data.status === 304 && cache_valid){
			response_data = this.#read_bare_response(await this.#write_bare_response(data.body, data.status, data.statusText, data.headers));
		}else if(cache !== 'no-store'){
			await this.#cache(response, destination_id, response_data);
		}

		return response_data;
	}
	async #cache(response, destination_id, response_data){
		let parsed = {};
		
		if(response_data.headers.has('cache-control')){
			parsed = parse(response_data.headers.get('cache-control'));
		}

		if('no-cache' in parsed){
			return;
		}

		let expires;

		const now = Date.now();

		if('expires' in parsed){
			expires = new Date(parsed.expires);
		}else if('max-age' in parsed){
			expires = new Date(now + (parsed['max-age'] * 1e3));
		}else{
			expires = new Date(now + 5e3);
		}

		if(expires.getTime() < now){
			return;
		}

		if((expires.getTime() - now) > (hour * 2)){
			expires = new Date(now + 5e3);
		}

		const array_buffer = await response.arrayBuffer();

		const { store } = this.db.transaction('cache', 'readwrite');

		const put = {
			id: destination_id,
			expires,
			headers: response_data.raw_headers,
			status: response_data.status,
			statusText: response_data.statusText,
			body: array_buffer,
		};

		if(response_data.headers.has('etag')){
			put.etag = response_data.headers.get('etag');
		}

		if(response_data.headers.has('last-modified')){
			put.lastModified = new Date(response_data.headers.get('last-modified'));
		}

		if(response_data.headers.has('expires')){
			put.expires = new Date(response_data.headers.get('expires'));
		}

		await store.put(put);

		response_data.response_body = array_buffer;
	}
};

export class BareError extends Error {
	constructor(status, body){
		super(body.message);
		this.status = status;
		this.body = body;
	}
};