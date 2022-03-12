// Implements the protocol for requesting bare data from a server
// See ../Server/Send.mjs

import { encodeProtocol } from './encodeProtocol.js';
import global from './global.js';

export const forbids_body = ['GET','HEAD'];
export const status_empty = [101,204,205,304];
export const status_redirect = [300,301,302,303,304,305,306,307,308];

const { fetch, WebSocket } = global;

export default class Bare {
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
	async fetch(method, request_headers, body, protocol, host, port, path){
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
		
		const response = await fetch(request);
	
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
		
		let result;
		
		if(status_empty.includes(+status)){
			result = new Response(undefined, {
				status,
				statusText,
				headers,
			});
		}else{
			result = new Response(response.body, {
				status,
				statusText,
				headers,
			});
		}
	
		result.json_headers = json_headers;
		result.raw_header_names = raw_header_names;
		
		return result;
	}
};

export class BareError extends Error {
	constructor(status, body){
		super(body.message);
		this.status = status;
		this.body = body;
	}
};