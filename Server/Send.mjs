import fs from 'fs';
import { Fetch } from './Fetch.mjs';
import { DecompressResponse } from './HTTPUtil.mjs'
import { MapHeaderNames, ObjectFromRawHeaders } from './HeaderUtil.mjs'
import { CompilationPath } from './Compiler.mjs';
import { crossorigins, html_types, get_mime } from '../RewriteHTML.mjs';
import { Stream } from 'stream';
import setcookie_parser from 'set-cookie-parser';
import cookie from 'cookie';
import { parse } from 'path';
import { request } from 'http';

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

function rewrite_setcookie(setcookie, server, url, key){
	const set_cookies = [];
	const parsed = setcookie_parser(setcookie);

	// wip pathing
	for(let set of parsed){
		// $cookie@/path
		// no need to include host when set.path
		
		let host = set.domain || new URL(url).host;
		let host_fixed = true;
		if(host.startsWith('.')){
			host_fixed = false;
			host = host.slice(1);
			// dont append ']'
		}

		// test host and set.domain ownership
		
		delete set.cookie;

		delete set.domain;
		
		const setp = set.path == '/' || !set.path ? '' : set.path;

		// set.name.lastIndexOf('/') must be (set.name + '/') not whats in setp
		set.name = set.name + '/' + encodeURIComponent(setp);
		set.path = server.tomp.prefix + server.tomp.url.wrap_host(host, key);
		if(host_fixed)set.path += ']/';

		set_cookies.push(cookie.serialize(set.name, set.value, set));
	}

	return set_cookies;
}

function handle_common_request(server, server_request, request_headers, url, key, crossorigin){
	if('referer' in server_request.headers){
		const ref = new URL(server_request.headers.referer);
		const {service,query,field} = server.get_attributes(ref.pathname);
		if(service == 'html'){
			request_headers.referer = server.tomp.url.unwrap(query, field, key);
		}else{
			delete request_headers.referer;
		}
	}
	
	var send_cookies = true;
	switch(crossorigin){
		case'unknown':
			send_cookies = true;
			break;
		case undefined:
			send_cookies = true;
		case'anonymous':
		case'':
			send_cookies = false;
			break;
		case'use-credentials':

			if('referer' in server_request.headers){
				send_cookies = new URL(request_headers.referer).host == new URL(url).host;
			}

			break;
	}

	if(send_cookies){
		const parsed_cookies = cookie.parse(request_headers['cookie']);
		const new_cookies = [];
		const { pathname } = new URL(url);

		request_headers['cookie'] = '';

		for(let cname in parsed_cookies){
			const pathind = cname.lastIndexOf('/');
			if(pathind == -1)continue;
			const name = cname.slice(0, pathind);
			const path = decodeURIComponent(cname.slice(pathind + 1) || '/');
			
			if(pathname.startsWith(path)){
				new_cookies.push(cookie.serialize(name, parsed_cookies[cname]));
			}
		}

		if(new_cookies.length)request_headers['cookie'] += new_cookies.join('; ');
		else delete request_headers['cookie'];
	}else{
		delete request_headers['cookie'];
	}
}

function handle_common_response(server, server_request, server_response, url, key, response, response_headers){
	
	// server.tomp.log.debug(url, response_headers);

	// whitelist headers soon?

	for(let remove of remove_csp_headers)delete response_headers[remove];
	for(let remove of remove_general_headers)delete response_headers[remove];
	
	const set_cookies = [
		server.get_setcookie(key),
	];

	for(let set of response_headers['set-cookie'] || []){
		set_cookies.push(...rewrite_setcookie(set, server, url, key));
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

	response_headers['referrer-policy'] = 'same-origin';
}

function get_data(server, server_request, server_response, query, field){
	// documents should NOT have queries.
	
	const key = server.get_key(server_request);
	
	if(!key){
		server.send_json(server_response, 400, { message: server.messages['error.nokey'] });
		return { gd_error: true };
	}

	const request_headers = {...server_request.headers};
	
	var crossorigin = 'unknown';

	const search_ind = field.indexOf('?');
	if(search_ind != -1){
		const search = field.slice(search_ind);
		field = field.slice(0, search_ind);
		
		const params = new URLSearchParams(search);
		crossorigin = crossorigins[parseInt(params.get('crossorigin'), 16)];
	}

	const url = server.tomp.url.unwrap(query, field, key);
	
	try{
		new URL(url);
	}catch(err){
		server.send_json(server_response, 400, { message: server.messages['error.badurl'] });
		return { gd_error: true };
	}
	
	handle_common_request(server, server_request, request_headers, url, key, crossorigin);
	
	return {
		gd_error: false,
		url,
		key,
		request_headers,
	};
}

export async function SendBinary(server, server_request, server_response, query, field){
	const {gd_error,url,key,request_headers} = get_data(server, server_request, server_response, query, field);
	if(gd_error)return;
	
	const response = await Fetch(server_request, request_headers, url);
	const response_headers = Object.setPrototypeOf({...response.headers}, null);

	handle_common_response(server, server_request, server_response, url, key, response, response_headers);
	
	server_response.writeHead(response.statusCode, response_headers);
	response.pipe(server_response);
}

export async function SendForm(server, server_request, server_response, query, field){
	const headers = Object.setPrototypeOf({}, null);

	const search_ind = field.indexOf('?');
	if(search_ind == -1)return void server.send_json(server_response, 400, { message: server.messages['error.badform.get'] });
	const search = field.slice(search_ind);
	field = field.slice(0, search_ind);
	
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
	const {gd_error,url,key,request_headers} = get_data(server, server_request, server_response, query, field);
	if(gd_error)return;
	
	const response = await Fetch(server_request, request_headers, url);
	const response_headers = Object.setPrototypeOf({...response.headers}, null);

	var send;
	if(!status_empty.includes(response.statusCode)){
		send = Buffer.from(rewriter.wrap((await DecompressResponse(response)).toString(), url, key));
		for(let remove of remove_encoding_headers)delete response_headers[remove];
		response_headers['content-length'] = send.byteLength;
	}

	handle_common_response(server, server_request, server_response, url, key, response, response_headers);
	
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

export async function SendManifest(server, server_request, server_response, query, field){
	return await SendRewrittenScript(server.tomp.manifest, server, server_request, server_response, query, field);
}

export async function SendHTML(server, server_request, server_response, query, field){
	const {gd_error,url,key,request_headers} = get_data(server, server_request, server_response, query, field);
	if(gd_error)return;
	
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
	
	handle_common_response(server, server_request, server_response, url, key, response, response_headers);
	
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