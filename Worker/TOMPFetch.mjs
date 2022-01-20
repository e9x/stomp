// Implements the protocol for requesting bare data from a server
// See ../Server/Send.mjs
import {header_json_prefix, header_real_prefix} from '../SendConsts.mjs'
import { TOMPError } from '../TOMPError.mjs';

const forbids_body = ['GET','HEAD'];

export async function TOMPFetch(server, url, server_request, raw_request_headers){
	const request_headers = new Headers();

	// Encode
	for(let [header,value] of raw_request_headers.entries()){
		request_headers.set(header_real_prefix + header, value);
	}
	
	const options = {
		credentials: 'omit',
		headers: request_headers,
		method: server_request.method,
	};

	if(!forbids_body.includes(options.method?.toUpperCase())){
		// https://developer.mozilla.org/en-US/docs/Web/API/Request/body#browser_compatibility
		options.body = await server_request.blob();
	}

	const request = new Request(server.tomp.prefix + 'server:bare/?url=' + encodeURIComponent(JSON.stringify(url)), options);
	
	const response = await fetch(request);

	if(!response.ok){
		throw new TOMPError(response.status, await response.json());
	}

	let status = 200;
	const headers = new Headers();
	const raw_array = [];
	const json_headers = {};
	
	// Decode
	for(let [header,value] of response.headers.entries()){
		if(header == 'x-tomp-status'){
			status = parseInt(value, 16);
		}else if(header == 'x-tomp-raw'){
			raw_array.push(...JSON.parse(value));
		}else if(header == 'content-length'){
			headers.set(header, value);
		}else if(header.startsWith(header_real_prefix)){
			const name = header.slice(header_real_prefix.length);
			headers.set(name, value);
		}else if(header.startsWith(header_json_prefix)){
			const name = header.slice(header_real_prefix.length);
			const parsed = JSON.parse(value);
			json_headers[name] = parsed;
		}
	}

	const spoof = {
		status,
		headers,
		raw_array,
		json_headers,
		arrayBuffer: response.arrayBuffer.bind(response),
		blob: response.blob.bind(response),
		body: response.body,
		bodyUsed: response.bodyUsed,
		clone: response.clone.bind(response),
		formData: response.formData.bind(response),
		json: response.json.bind(response),
		ok: response.ok,
		redirected: response.redirected,
		statusText: response.statusText,
		text: response.text.bind(response),
		type: response.type,
		url: response.url,
	};

	return spoof;
}