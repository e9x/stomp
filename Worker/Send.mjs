import { MapHeaderNames, ObjectFromRawHeaders } from './HeaderUtil.mjs'
import { crossorigins, html_types, get_mime } from '../RewriteHTML.mjs';
import setcookie_parser from 'set-cookie-parser';
import cookie from 'cookie';
import messages from '../Messages.mjs';

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

function rewrite_setcookie(setcookie, server, host, key){
	const set_cookies = [];
	const parsed = setcookie_parser(setcookie, {
		decodeValues: false,
		silent: true,
	});

	// wip pathing
	for(let set of parsed){
		// $cookie@/path
		// no need to include host when set.path
		
		let domain = set.domain || host;
		let domain_fixed = true;
		if(domain.startsWith('.')){
			domain_fixed = false;
			domain = domain.slice(1);
			// dont append ']'
		}

		// test host and set.domain ownership
		
		delete set.cookie;

		delete set.domain;
		
		const setp = set.path == '/' || !set.path ? '' : set.path;

		// set.name.lastIndexOf('/') must be (set.name + '/') not whats in setp
		set.name = set.name + '/' + encodeURIComponent(setp);
		set.path = server.tomp.prefix + server.tomp.url.wrap_host(domain, key);
		if(domain_fixed)set.path += ']/';

		console.log(domain, set.name, set.value);
		
		set_cookies.push(cookie.serialize(set.name, set.value, { decode: x => x, encode: x => x, ...set }));
	}
	
	return set_cookies;
}

function handle_common_request(server, server_request, request_headers, url, key, crossorigin){
	if(server_request.headers.has('referer')){
		const ref = new URL(server_request.headers.get('referer'));
		const {service,query,field} = server.get_attributes(ref.pathname);
		if(service == 'html'){
			request_headers.referer = server.tomp.url.unwrap(query, field, key).toString();
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
				send_cookies = new URL(request_headers.referer).host == url.host;
			}

			break;
	}

	if(url.protocol == 'http:')request_headers.set('upgrade-insecure-requests', '1');
	request_headers.set('host', url.host);
	
	if(send_cookies && request_headers.has('cookie')){
		const parsed_cookies = cookie.parse(request_headers.get('cookie'), { decode: x => x, encode: x => x });
		const new_cookies = [];
		
		for(let cname in parsed_cookies){
			const pathind = cname.lastIndexOf('/');
			if(pathind == -1)continue;
			const name = cname.slice(0, pathind);
			const path = decodeURIComponent(cname.slice(pathind + 1) || '/');
			
			if(url.path.startsWith(path)){
				new_cookies.push(cookie.serialize(name, parsed_cookies[cname], { decode: x => x, encode: x => x }));
			}
		}

		if(new_cookies.length)request_headers.set('cookie', new_cookies.join('; '));
		else request_headers.delete('cookie');
		// console.log('send', request_headers['cookie']);
		
	}else{
		request_headers.delete('cookie');
	}
}

function handle_common_response(server, server_request, url, key, response){
	const response_headers = new Headers(server_request.headers);
	// server.tomp.log.debug(url, response_headers);

	// whitelist headers soon?

	for(let remove of remove_csp_headers)response_headers.delete(remove);
	for(let remove of remove_general_headers)response_headers.delete(remove);
	
	console.log(rewrite_setcookie(response_headers.get('set-cookie'), server, url.host, key));
	
	response_headers.delete('set-cookie');
	
	response_headers.set('referrer-policy', 'same-origin') ;
	
	// todo: ~~wipe cache when the key changes?~~ not needed, key changes and url does too
	// cache builds up
	
	const will_redirect = response.statusCode >= 300 && response.statusCode < 400 || response.statusCode == 201;

	// CONTENT-LOCATION WHAT
	if(will_redirect && response_headers.has('location')){
		let location = response_headers.get('location');
		// if new URL() fails, no redirect
		
		let evaluated;

		try{
			evaluated = new URL(location, url);
			response_headers.set('location', server.tomp.html.serve(evaluated.href, url, key));
		}catch(err){
			console.error('failure', err);
			response_headers.delete('location');
		}
	}
	
	return response_headers;
}

function get_data(server, server_request, query, field){
	// documents should NOT have queries.
	
	const key = server.key;
	
	if(!key){
		return { gd_error: server.send_json(400, { message: messages['error.nokey'] }) };
	}

	const request_headers = new Headers(server_request.headers);
	
	var crossorigin = 'unknown';

	const search_ind = field.indexOf('?');
	if(search_ind != -1){
		const search = field.slice(search_ind);
		field = field.slice(0, search_ind);
		
		const params = new URLSearchParams(search);
		crossorigin = crossorigins[parseInt(params.get('crossorigin'), 16)];
	}

	const url = server.tomp.url.unwrap(query, field, key);
	
	/*try{
		new URL(url);
	}catch(err){
		server.send_json(400, { message: messages['error.badurl'] });
		return { gd_error: server.send_json(400, { message: messages['error.nokey'] }) };
	}*/
	
	handle_common_request(server, server_request, request_headers, url, key, crossorigin);
	
	return {
		gd_error: false,
		url,
		key,
		request_headers,
	};
}

export async function SendBinary(server, server_request, query, field){
	const {gd_error,url,key,request_headers} = get_data(server, server_request, query, field);
	if(gd_error)return gd_error;
	
	const response = await fetch(url, {
		headers: request_headers,
	});
	const response_headers = handle_common_response(server, server_request, url, key, response);
	
	return new Response(response.body, {
		headers: response_headers,
	});
}

export async function SendForm(server, server_request, query, field){
	const headers = new Headers();

	const search_ind = field.indexOf('?');
	if(search_ind == -1)return void server.send_json(400, { message: messages['error.badform.get'] });
	const search = field.slice(search_ind);
	field = field.slice(0, search_ind);
	
	const {gd_error,url,key} = get_data(server, server_request, query, field);
	if(gd_error)return gd_error;
	
	const orig_search_ind = url.path.indexOf('?');
	
	url.path = url.path.slice(0, orig_search_ind == -1 ? url.length : orig_search_ind) + search;
	headers.set('location', server.tomp.url.wrap_parsed(url, key, 'html'));
	// server.tomp.html.serve(updated, updated, key);

	return new Response(new Uint8Array(), { headers, status: 302 });
}

const status_empty = [204,304];

async function SendRewrittenScript(rewriter, server, server_request, query, field){
	const {gd_error,url,key,request_headers} = get_data(server, server_request, query, field);
	if(gd_error)return gd_error;
	
	const response = await fetch(url, {
		headers: request_headers,
	});
	const response_headers = handle_common_response(server, server_request, url, key, response);
	
	var send = new Uint8Array();
	if(!status_empty.includes(response.statusCode)){
		send = rewriter.wrap(await response.text(), url.toString(), key);
		for(let remove of remove_encoding_headers)delete response_headers[remove];
	}

	// MapHeaderNames(ObjectFromRawHeaders(response.rawHeaders), response_headers);
	
	return new Response(send, {
		headers: response_headers,
		status: response.status,
	});
}

export async function SendJS(server, server_request, query, field){
	return await SendRewrittenScript(server.tomp.js, server, server_request, query, field);
}

export async function SendCSS(server, server_request, query, field){
	return await SendRewrittenScript(server.tomp.css, server, server_request, query, field);
}

export async function SendManifest(server, server_request, query, field){
	return await SendRewrittenScript(server.tomp.manifest, server, server_request, query, field);
}

export async function SendHTML(server, server_request, query, field){
	const {gd_error,url,key,request_headers} = get_data(server, server_request, query, field);
	if(gd_error)return gd_error;
	
	// MapHeaderNames(ObjectFromRawHeaders(server_request.rawHeaders), request_headers);
	
	const response = await fetch(url, {
		headers: request_headers,
	});
	const response_headers = handle_common_response(server, server_request, url, key, response);

	var send = new Uint8Array();
	if(!status_empty.includes(response.statusCode)){
		if(html_types.includes(get_mime(response_headers.get('content-type') || ''))){
			send = Buffer.from(server.tomp.html.wrap(await response.text(), url.toString(), key));
			for(let remove of remove_encoding_headers)delete response_headers[remove];
		}else{
			send = response;
		}
	}
	for(let remove of remove_html_headers)delete response_headers[remove];

	if(response_headers.has('refresh')){
		response_headers.set('refresh', server.tomp.html.wrap_http_refresh(response_headers['refresh'], url, key));
	}

	// MapHeaderNames(ObjectFromRawHeaders(response.rawHeaders), response_headers);
	
	return new Response(send, {
		headers: response_headers,
		status: response.status,
	});
}