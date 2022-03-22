import Client, { BareError, status_cache, status_empty } from './Client.js';
import { encodeProtocol } from '../encodeProtocol.js';
import global from '../global.js';
import { split_headers, join_headers } from './splitHeaderUtil.js';
import md5 from 'md5';

const { fetch, WebSocket, Request } = global;

const HOUR = 60e3 * 60;

export default class ClientV2 extends Client {
	static version = 2;
	#open;
	constructor(...args){
		super(...args);

		this.ws = new URL(this.base);
		this.http = new URL(this.base);
		this.new_meta = new URL('./ws-new-meta', this.base);
		this.get_meta = new URL(`./ws-meta`, this.base);

		if(this.ws.protocol === 'https:'){
			this.ws.protocol = 'wss:';
		}else{
			this.ws.protocol = 'ws:';
		}
	}
	async connect(request_headers, protocol, host, port, path){
		await this.#open;

		const forward_headers = [
			'accept-encoding',
			'accept-language',
			'sec-websocket-extensions',
			'sec-websocket-key',
			'sec-websocket-version',
		];

		const request = new Request(this.new_meta, {
			method: 'GET',
			headers: {
				...this.#write_bare_request(protocol, host, path, port, request_headers, forward_headers, false),
			},
		});

		const assign_meta = await fetch(request);

		if(!assign_meta.ok){
			throw BareError(assign_meta.status, await assign_meta.json());
		}

		const id = await assign_meta.text();
		
		const socket = new WebSocket(this.ws, [
			'bare',
			encodeProtocol(id),
		]);

		socket.meta = new Promise((resolve, reject) => {
			socket.addEventListener('open', async () => {
				const outgoing = await fetch(this.get_meta, {
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
		await this.#open;

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

		const forward_headers = ['accept-encoding', 'accept-language','if-modified-since','if-none-match'];
		const pass_headers = ['cache-control','etag'];
		const pass_status = status_cache;

		const options = {
			credentials: 'omit',
			method: method,
			cache,
		};
	
		if(body !== undefined){
			options.body = body;
		}
		
		options.headers = {
			...this.#write_bare_request(protocol, host, path, port, bare_headers, forward_headers, true, pass_headers, pass_status),
		};

		// bare can be an absolute path containing no origin, it becomes relative to the script	
		const request = new Request(this.http + '?', options);

		const response = await fetch(request);

		const { status, statusText, headers, json_headers, raw_header_names, response_body } = await this.#read_bare_response(response);

		let result;

		if(!status_cache.includes(status) && status_empty.includes(status)){
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
	async #read_bare_response(response){
		if(!response.ok){
			throw new BareError(response.status, await response.json());
		}
		
		const response_headers = Object.fromEntries(response.headers);
		join_headers(response_headers);

		const status = parseInt(response_headers['x-bare-status']);
		const statusText = response_headers['x-bare-status-text'];
		const raw_headers = JSON.parse(response_headers['x-bare-headers']);
		
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
	#write_bare_request(protocol, host, path, port, bare_headers, forward_headers, pass, pass_headers, pass_status){
		const headers = {
			'x-bare-protocol': protocol,
			'x-bare-host': host,
			'x-bare-path': path,
			'x-bare-port': port,
			'x-bare-headers': JSON.stringify(bare_headers),
			'x-bare-forward-headers': JSON.stringify(forward_headers),
		};

		if(pass){
			headers['x-bare-pass-headers'] = JSON.stringify(pass_headers);
			headers['x-bare-pass-status'] = JSON.stringify(pass_status);
		}

		split_headers(headers);

		return headers;
	}
};