// Implements the protocol for requesting bare data from a server
// See ../Server/Send.mjs
import {header_json_prefix, header_real_prefix} from '../SendConsts.mjs'
import { TOMPError } from '../TOMPError.mjs';

export async function TOMPFetch(server, url, raw_request_headers, key){
	const request_headers = new Headers();

	// Encode
	for(let [header,value] of raw_request_headers.entries()){
		request_headers.set(header_real_prefix + header, value);
	}

	request_headers.set('x-tomp-key', key);
	
	const response = await fetch(server.tomp.url.wrap_parsed(url, key, 'server:bare'), {
		headers: request_headers,
	});

	if(!response.ok){
		throw new TOMPError(response.status, await response.json());
	}

	const headers = new Headers();
	var status = 200;
	const raw_array = [];
	const json_headers = {};
	
	// Decode
	for(let [header,value] of response.headers.entries()){
		if(header == 'x-tomp-status'){
			status = parseInt(value, 16);
		}else if(header == 'x-tomp-raw'){
			raw_array.push(...JSON.parse(value));
		}else if(header.startsWith(header_real_prefix)){
			const name = header.slice(header_real_prefix.length);
			headers.set(name, value);
		}else if(header.startsWith(header_json_prefix)){
			const name = header.slice(header_real_prefix.length);
			const parsed = JSON.parse(value);
			json_headers[name] = parsed;
		}
	}

	const new_response = new Response(response.body, {
		status,
		headers,
	});

	new_response.raw_array = raw_array;
	new_response.json_headers = json_headers;
	return new_response;
}