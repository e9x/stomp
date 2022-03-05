// Implements the protocol for requesting bare data from a server
// See ../Server/Send.mjs

export const forbids_body = ['GET','HEAD'];
export const status_empty = [101,204,205,304];
export const status_redirect = [300,301,302,303,304,305,306,307,308];

export class BareError extends Error {
	constructor(status, body){
		super(body.message);
		this.status = status;
		this.body = body;
	}
};

export default async function bareFetch(server, url, server_request, request_headers){
	if(url.protocol.startsWith('blob:')){
		const response = await fetch(`blob:${location.origin}${url.path}`);
		response.json_headers = Object.fromEntries(response.headers.entries());
		response.raw_header_names = [];
		return response;
	}

	const options = {
		credentials: 'omit',
		headers: {
			'x-bare-protocol': url.protocol,
			'x-bare-host': url.host,
			'x-bare-path': url.path,
			'x-bare-port': url.port,
			'x-bare-headers': JSON.stringify(request_headers instanceof Headers ? Object.fromEntries([...request_headers.entries()]) : request_headers),
			'x-bare-forward-headers': JSON.stringify(['accept-encoding', 'accept-language']),
		},
		method: server_request.method,
	};

	if(!forbids_body.includes(options.method?.toUpperCase())){
		// https://developer.mozilla.org/en-US/docs/Web/API/Request/body#browser_compatibility
		options.body = await server_request.blob();
	}
	
	
	// bare can be an absolute path containing no origin, it becomes relative to the script	
	const request = new Request(new URL(server.tomp.bare + 'v1/', location), options);
	
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