import fs from 'fs';
import { Fetch } from './Fetch.mjs';
import { DecompressResponse } from './HTTPUtil.mjs'
import { MapHeaderNames, ObjectFromRawHeaders } from './HeaderUtil.mjs'
import { CompilationPath } from './Compiler.mjs';
import { html_types, get_mime } from '../RewriteHTML.mjs';
import { Stream } from 'stream';
import setcookie_parser from 'set-cookie-parser';
import cookie from 'cookie';

const remove_general_headers = [
	'alt-svc',
	'x-xss-protection',
];

const remove_html_headers = [
	'x-transfer-encoding',
];

const remove_encoding_headers = [
	'x-content-encoding',
	'content-encoding',
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

function handle_common(server, server_request, server_response, url, key, response, response_headers){
	
	// server.tomp.log.debug(url, response_headers);

	// whitelist headers soon?

	for(let remove of remove_csp_headers)delete response_headers[remove];
	for(let remove of remove_general_headers)delete response_headers[remove];
	
	const set_cookies = [
		server.get_setcookie(key),
	];

	for(let set of response_headers['set-cookie'] || []){
		const parsed = setcookie_parser(set);

		for(let set of parsed){
			// $cookie @ /path
			// no need to include host when set.path
						
			const host = new URL(url).host;
			// test host and set.domain ownership

			delete set.cookie;

			delete set.domain;
			
			set.name = set.name + '@' + set.path;
			set.path = server.tomp.prefix + server.tomp.url.wrap_host(set.domain || host, key);
			
			set_cookies.push(cookie.serialize(set.name, set.value, set));
		}
	}

	response_headers['set-cookie'] = set_cookies;
	
	// todo: ~~wipe cache when the key changes?~~ not needed, key changes and url does too
	// cache builds up
	
	const will_redirect = response.statusCode >= 300 && response.statusCode < 400 || response.statusCode == 201;

	// CONTENT-LOCATION WHAT
	if(will_redirect && 'location' in response_headers){
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
			response_headers['location'] = server.tomp.html.serve(evaluated.href, url, key);
		}
	}
}

function get_data(server, server_request, server_response, query, field){
	const key = server.get_key(server_request);
	
	if(!key){
		server.send_json(server_response, 400, { message: server.messages['error.nokey'] });
		return { gd_error: true };
	}

	const url = server.tomp.url.unwrap(query, field, key);
	
	try{
		new URL(url);
	}catch(err){
		server.send_json(server_response, 400, { message: server.messages['error.badurl'] });
		return { gd_error: true };
	}

	return {
		gd_error: false,
		url,
		key,
	};
}

export async function SendBinary(server, server_request, server_response, query, field){
	const {gd_error,url,key} = get_data(server, server_request, server_response, query, field);
	if(gd_error)return;
	
	const request_headers = {...server_request.headers};
	request_headers.host = url.host;
	const response = await Fetch(server_request, request_headers, url);
	const response_headers = Object.setPrototypeOf({...response.headers}, null);

	handle_common(server, server_request, server_response, url, key, response, response_headers);
	
	server_response.writeHead(response.statusCode, response_headers);
	response.pipe(server_response);
}

export async function SendForm(server, server_request, server_response, query, field){
	const headers = Object.setPrototypeOf({}, null);

	const search_ind = field.indexOf('?');
	if(search_ind == -1)return void server.send_json(server_response, 400, { message: server.messages['error.badform.get'] });
	const search = field.slice(search_ind);
	field = field.slice(0, search_ind);
	
	console.log(field);

	const {gd_error,url,key} = get_data(server, server_request, server_response, query, field);
	if(gd_error)return;
	
	const orig_search_ind = url.indexOf('?');
	
	const updated = url.slice(0, orig_search_ind == -1 ? url.length : orig_search_ind) + search;
	headers['location'] = server.tomp.html.serve(updated, updated, key);


	server_response.writeHead(302, headers);
	server_response.end();
}

const status_empty = [204,304];

async function SendRewrittenScript(rewriter, server, server_request, server_response, query, field){
	const {gd_error,url,key} = get_data(server, server_request, server_response, query, field);
	if(gd_error)return;
	
	const request_headers = {...server_request.headers};
	request_headers.host = url.host;
	const response = await Fetch(server_request, request_headers, url);
	const response_headers = Object.setPrototypeOf({...response.headers}, null);

	var send;
	if(!status_empty.includes(response.statusCode)){
		send = Buffer.from(rewriter.wrap((await DecompressResponse(response)).toString(), url, key));
		for(let remove of remove_encoding_headers)delete response_headers[remove];
		response_headers['content-length'] = send.byteLength;
	}

	handle_common(server, server_request, server_response, url, key, response, response_headers);
	
	MapHeaderNames(ObjectFromRawHeaders(response.rawHeaders), response_headers);
	server_response.writeHead(response.statusCode, response_headers);
	if(Buffer.isBuffer(send))server_response.write(send);
	server_response.end();
}

export async function SendJS(server, server_request, server_response, query, field){
	return await SendRewrittenScript(server.tomp.js, server, server_request, server_response, query, field);
}

export async function SendCSS(server, server_request, server_response, query, field){
	return await SendRewrittenScript(server.tomp.css, server, server_request, server_response, query, field);
}

export async function SendHTML(server, server_request, server_response, query, field){
	const {gd_error,url,key} = get_data(server, server_request, server_response, query, field);
	if(gd_error)return;
	
	const request_headers = {...server_request.headers};
	MapHeaderNames(ObjectFromRawHeaders(server_request.rawHeaders), request_headers);
	
	const response = await Fetch(server_request, request_headers, url);	
	const response_headers = Object.setPrototypeOf({...response.headers}, null);

	var send;
	if(!status_empty.includes(response.statusCode)){
		if(html_types.includes(get_mime(response_headers['content-type'] || ''))){
			var send = Buffer.from(server.tomp.html.wrap((await DecompressResponse(response)).toString(), url, key));
			response_headers['content-length'] = send.byteLength;
			for(let remove of remove_encoding_headers)delete response_headers[remove];
		}else{
			var send = response;
		}
	}
	
	console.log('what');
	handle_common(server, server_request, server_response, url, key, response, response_headers);
	console.log('what');
	for(let remove of remove_html_headers)delete response_headers[remove];

	if('refresh' in response_headers){
		response_headers['refresh'] = server.tomp.html.wrap_http_refresh(response_headers['refresh'], url, key);
	}

	MapHeaderNames(ObjectFromRawHeaders(response.rawHeaders), response_headers);
	server_response.writeHead(response.statusCode, response_headers);

	if(send instanceof Buffer){
		server_response.write(send);
		server_response.end();
	}else if(send instanceof Stream){
		send.pipe(server_response);
	}else{
		server_response.end();
	}
}


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