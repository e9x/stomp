import Client, { BareError, status_cache, status_empty } from './Client.js';
import { encodeProtocol } from '../encodeProtocol.js';
import global from '../global.js';
import { split_headers, join_headers } from './splitHeaderUtil.js';
import md5 from 'md5';

const { fetch, WebSocket, Request } = global;

const HOUR = 60e3 * 60;

export default class ClientV2 extends Client {
	static version = 2;
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
		const forward_headers = [
			'accept-encoding',
			'accept-language',
			'sec-websocket-extensions',
			'sec-websocket-key',
			'sec-websocket-version',
		];

		const request = new Request(this.new_meta, {
			cache: 'no-cache',
		});

		this.#write_bare_request(request.headers, protocol, host, path, port, request_headers, forward_headers);

		const assign_meta = await fetch(request);

		if(!assign_meta.ok){
			throw new BareError(assign_meta.status, await assign_meta.json());
		}

		const id = await assign_meta.text();
		
		const socket = new WebSocket(this.ws, [ encodeProtocol(id) ]);

		socket.meta = new Promise((resolve, reject) => {
			socket.addEventListener('open', async () => {
				const outgoing = await fetch(this.get_meta, {
					headers: {
						'x-bare-id': id,
					},
					method: 'GET',
				});

				resolve(await this.#read_bare_response(outgoing));
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

		const options = {
			credentials: 'omit',
			method: method,
		};

		if(cache !== 'only-if-cached'){
			options.cache = cache;
		}
	
		if(body !== undefined){
			options.body = body;
		}

		// bare can be an absolute path containing no origin, it becomes relative to the script	
		const request = new Request(this.http + '?cache=' + md5(`${protocol}${host}${port}${path}`), options);

		this.#write_bare_request(request.headers, protocol, host, path, port, bare_headers, [], [], [])

		const response = await fetch(request);

		let { status, statusText, headers, json_headers, raw_header_names, response_body } = await this.#read_bare_response(response);

		let result;

		if(status_cache.includes(status)){
			status = response.status;
			statusText = response.statusText; 
		}

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
	async #read_bare_response(response){
		if(!response.ok){
			throw new BareError(response.status, await response.json());
		}

		const response_headers = join_headers(response.headers);

		if(response_headers.error){
			throw new BareError(response_headers.error);
		}

		const status = parseInt(response_headers.get('x-bare-status'));
		const statusText = response_headers.get('x-bare-status-text');
		const raw_headers = JSON.parse(response_headers.get('x-bare-headers'));
		
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
	#write_bare_request(headers, protocol, host, path, port, bare_headers, forward_headers, pass_headers = [], pass_status = []){
		headers.set('x-bare-protocol', protocol);
		headers.set('x-bare-host', host);
		headers.set('x-bare-path', path);
		headers.set('x-bare-port', port);
		headers.set('x-bare-headers', JSON.stringify(bare_headers));
		
		for(let header of forward_headers){
			headers.append('x-bare-forward-headers', header);
		}
	
		for(let header of pass_headers){
			headers.append('x-bare-pass-headers', header);
		}

		for(let status of pass_status){
			headers.append('x-bare-pass-status', status);
		}
		
		split_headers(headers);

		return headers;
	}
};