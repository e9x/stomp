import fs from 'fs';

import { Fetch } from './Fetch.mjs';
import { DecompressResponse } from './HTTPUtil.mjs'
import { MapHeaderNames, ObjectFromRawHeaders } from './HeaderUtil.mjs'
import { CompilationPath } from './Compiler.mjs';

const remove_general = [
	'alt-svc',
	'x-transfer-encoding',
	'x-content-encoding',
	'content-encoding',
	'x-xss-protection',
];

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#security
const remove_csp_headers = [
	'cross-origin-embedder-policy',
	'cross-origin-opener-policy',
	'cross-origin-resource-policy',
	'content-security-policy',
	'content-security-policy-report-only',
	'expect-ct',
	'feature-policy',
	'origin-isolation',
	'strict-transport-security',
	'upgrade-insecure-requests',
	'x-content-type-options',
	'x-download-options',
	'x-frame-options',
	'x-permitted-cross-domain-policies',
	'x-powered-by',
	'x-xss-protection',
];

export async function SendScript(server, request, response){
	try{
		const handle = await fs.promises.open(CompilationPath, 'r');
		
		const { size } = await handle.stat();
		
		const buffer = Buffer.alloc(size);
		
		const { bytesRead } = await handle.read(buffer, 0, buffer.byteLength, 0);
		
		handle.close();

		if(bytesRead < buffer.byteLength)server.tomp.log.error('Error reading file');
		
		let script = buffer.toString();
		
		script = script.replace(/client_information/g, JSON.stringify([
			server.tomp,
			server.get_key(request),
		]));

		var send = Buffer.from(script);
	}catch(err){
		if(err.code == 'ENOENT'){
			return void server.send_json(response, 500, { message: server.messages['generic.error.notready'] });
		}else{
			server.tomp.log.error('Error reading backend compilation:', err);
			return void server.send_json(response, 500, { message: server.messages['generic.exception.request'] });
		}
	}
	
	response.writeHead(200, {
		'content-type': 'application/javascript',
		'content-length': send.byteLength,
	});
	
	response.write(send);
	response.end();
}

export async function SendBinary(server, server_request, server_response, field){
	const key = server.get_key(server_request);
	const url = server.tomp.codec.unwrap(decodeURIComponent(field), key);
			
	const request_headers = {...server_request.headers};
	request_headers.host = url.host;
	const response = await Fetch(server_request, request_headers, url);
	const response_headers = Object.setPrototypeOf({...response.headers}, null);

	for(let remove of remove_csp_headers)delete response_headers[remove];
	for(let remove of remove_general)delete response_headers[remove];

	server_response.writeHead(response.statusCode, response.headers);
	response.pipe(server_response);
}

// placeholder
export async function SendCSS(server, server_request, server_response, field){
	const key = server.get_key(server_request);
	const url = server.tomp.codec.unwrap(decodeURIComponent(field), key);
			
	const request_headers = {...server_request.headers};
	request_headers.host = url.host;
	const response = await Fetch(server_request, request_headers, url);
	const response_headers = Object.setPrototypeOf({...response.headers}, null);

	for(let remove of remove_csp_headers)delete response_headers[remove];
	for(let remove of remove_general)delete response_headers[remove];

	server_response.writeHead(response.statusCode, response.headers);
	response.pipe(server_response);
}

export async function SendJS(server, server_request, server_response, field){
	const key = server.get_key(server_request);
	const url = server.tomp.codec.unwrap(decodeURIComponent(field), key);
			
	const request_headers = {...server_request.headers};
	request_headers.host = url.host;
	const response = await Fetch(server_request, request_headers, url);
	const send = Buffer.from(server.tomp.js.wrap((await DecompressResponse(response)).toString(), url, key));
	const response_headers = Object.setPrototypeOf({...response.headers}, null);

	for(let remove of remove_csp_headers)delete response_headers[remove];
	for(let remove of remove_general)delete response_headers[remove];

	response_headers['content-length'] = send.byteLength;
	
	const set_cookies = [].concat(response['set-cookie']);

	for(let set of set_cookies){
		
	}

	// too much work rn
	set_cookies.length = 0;

	response['set-cookie'] = set_cookies.length == 1 ? set_cookies[0] : set_cookies;

	MapHeaderNames(ObjectFromRawHeaders(response.rawHeaders), response_headers);
	server_response.writeHead(response.statusCode, response_headers);
	server_response.write(send);
	server_response.end();
}

export async function SendHTML(server, server_request, server_response, field){
	const key = server.get_key(server_request);
	const url = server.tomp.codec.unwrap(decodeURIComponent(field), key);
	
	try{
		new URL(url);
	}catch(err){
		return server.send_json(server_response, 400, { message: server.messages['generic.exception.badurl'] });
	}

	const request_headers = {...server_request.headers};
	MapHeaderNames(ObjectFromRawHeaders(server_request.rawHeaders), request_headers);

	const response = await Fetch(server_request, request_headers, url);
	const send = Buffer.from(server.tomp.html.wrap((await DecompressResponse(response)).toString(), url, key));
	const response_headers = Object.setPrototypeOf({...response.headers}, null);

	// server.tomp.log.debug(url, response_headers);

	// whitelist headers soon?

	for(let remove of remove_csp_headers)delete response_headers[remove];
	for(let remove of remove_general)delete response_headers[remove];
	
	response_headers['content-length'] = send.byteLength;
	
	const set_cookies = [].concat(response['set-cookie']);

	for(let set of set_cookies){
		
	}

	// too much work rn
	set_cookies.length = 0;

	response_headers['set-cookie'] = set_cookies.length == 1 ? set_cookies[0] : set_cookies;

	const will_redirect = response.statusCode >= 300 && response.statusCode < 400 || response.statusCode == 201;

	// CONTENT-LOCATION WHAT
	if(will_redirect && response_headers['location']){
		let location = response_headers['location'];
		delete response_headers['location'];
		// if new URL() fails, no redirect
		
		let evaluated;

		try{
			evaluated = new URL(location, url);
		}catch(err){
			console.error('failure', err);
		}

		if(evaluated){
			console.log(evaluated.href);
			response_headers['location'] = server.tomp.html.serve(evaluated.href, key);
		}
	}

	MapHeaderNames(ObjectFromRawHeaders(response.rawHeaders), response_headers);
	server_response.writeHead(response.statusCode, response_headers);
	server_response.write(send);
	server_response.end();
}