// Implements the protocol for requesting bare data from a server
// See ../Server/Send.mjs
import { TOMPError } from '../TOMPError.mjs';

const forbids_body = ['GET','HEAD'];

export async function TOMPFetch(server, url, server_request, request_headers){
	const options = {
		credentials: 'omit',
		headers: {
			'x-tomp-protocol': url.protocol,
			'x-tomp-host': url.host,
			'x-tomp-path': url.path,
			'x-tomp-port': url.port,
			'x-tomp-headers': JSON.stringify(request_headers instanceof Headers ? Object.fromEntries([...request_headers.entries()]) : request_headers),
		},
		method: server_request.method,
	};

	if(!forbids_body.includes(options.method?.toUpperCase())){
		// https://developer.mozilla.org/en-US/docs/Web/API/Request/body#browser_compatibility
		options.body = await server_request.blob();
	}
	
	
	// bare can be an absolute path containing no origin, it becomes relative to the script	
	const request = new Request(new URL(server.tomp.bare, location), options);
	
	const response = await fetch(request);

	if(!response.ok){
		throw new TOMPError(400, {
			message: 'An error occured when retrieving data from the bare server. Verify your bare server is running and the configuration points to it.', 
			received: {
				status: response.status,
				body: await response.text(),
			},
		});
	}

	const status = response.headers.get('x-tomp-status');
	const statusText = response.headers.get('x-tomp-status-text');
	// may be bloat if x-tomp-headers can just contain the raw capitalization
	const raw_headers = JSON.parse(response.headers.get('x-tomp-headers'));
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
	
	const spoof = {
		status,
		statusText,
		headers,
		json_headers,
		raw_header_names,
		arrayBuffer: response.arrayBuffer.bind(response),
		blob: response.blob.bind(response),
		body: response.body,
		bodyUsed: response.bodyUsed,
		clone: response.clone.bind(response),
		formData: response.formData.bind(response),
		json: response.json.bind(response),
		ok: response.ok,
		redirected: response.redirected,
		text: response.text.bind(response),
		type: response.type,
		url: response.url,
	};

	return spoof;
}