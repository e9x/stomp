// Implements the protocol for requesting bare data from a server
// See ../Server/Send.mjs

import { encodeProtocol } from './encodeProtocol.js';
import global from './global.js';

export const forbids_body = ['GET','HEAD'];
export const status_empty = [101,204,205,304];
export const status_redirect = [300,301,302,303,304,305,306,307,308];

import { openDB } from 'idb';
import { parse } from 'cache-control-parser';

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
				cache.createIndex('expires', 'etag');
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
	async #fetch_cached(destination_id, request){
		await this.#open;
		const { store } = this.db.transaction('cache', 'readwrite');
		const data = await store.get(destination_id);

		if(data === undefined){
			return await fetch(request);
		}

		return new Response(data.body, {
			headers: {
				'x-bare-status': data.status,
				'x-bare-status-text': data.statusText,
				'x-bare-headers': JSON.stringify(data.headers),
			},
		});
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

		const destination_id = `${protocol}${host}:${port}${path}`;

		const options = {
			credentials: 'omit',
			headers: {
				'x-bare-protocol': protocol,
				'x-bare-host': host,
				'x-bare-path': path,
				'x-bare-port': port,
				'x-bare-headers': JSON.stringify(bare_headers),
				'x-bare-forward-headers': JSON.stringify(forward_headers),
			},
			method: method,
		};
	
		if(body !== undefined){
			options.body = body;
		}
		
		// bare can be an absolute path containing no origin, it becomes relative to the script	
		const request = new Request(new URL(this.server + 'v1/', location), options);
		
		const response = await this.#fetch_cached(destination_id, request);
		
		if(!response.ok){
			throw new BareError(response.status, await response.json());
		}
	
		const status = response.headers.get('x-bare-status');
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
		
		// response MAY be read, receive new stream if so
		const response_body = await this.#cache(response, destination_id, status, statusText, headers, raw_headers);
		
		let result;
		
		if(status_empty.includes(+status)){
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
	async #cache(response, destination_id, status, statusText, headers, raw_headers){
		if(!headers.has('cache-control')){
			return response.body;
		}

		const parsed = parse(headers.get('cache-control'));

		if('no-cache' in parsed){
			return response.body;
		}

		let expires;

		if('expires' in parsed){
			expires = new Date(parsed.expires);
		}else if('max-age' in parsed){
			expires = new Date(Date.now() + (parsed['max-age'] * 1e3));
		}

		const array_buffer = await response.arrayBuffer();

		const { store } = this.db.transaction('cache', 'readwrite');

		await store.put({
			id: destination_id,
			expires,
			headers: raw_headers,
			status,
			statusText,
			body: array_buffer,
		});

		return array_buffer;
	}
};

export class BareError extends Error {
	constructor(status, body){
		super(body.message);
		this.status = status;
		this.body = body;
	}
};