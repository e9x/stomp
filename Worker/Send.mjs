import { MapHeaderNamesFromArray } from './HeaderUtil.mjs'
import { html_types, get_mime } from '../RewriteElements.mjs';
import { TOMPError } from '../TOMPError.mjs';
import { TOMPFetch } from './TOMPFetch.mjs';
import { load_setcookies, get_cookies } from './Cookies.mjs';
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

const status_empty = [101,204,205,304];

async function handle_common_request(server, server_request, request_headers, url){
	if(server_request.headers.has('referer')){
		const ref = new URL(server_request.headers.get('referer'));
		const {service,field} = server.get_attributes(ref.pathname);
		if(service == 'html'){
			request_headers.set('referer', server.tomp.url.unwrap(field).toString());
		}else{
			request_headers.delete('referer');
		}
	}
	
	let send_cookies = false;

	switch(server_request.credentials){
		case'include':

			send_cookies = true;

			break;
		case'same-origin':
			
			if(server_request.headers.has('referer')){
				send_cookies = new URL(request_headers.get('referer')).hostname == url.host;
			}

			break;
	}

	if(url.protocol == 'http:')request_headers.set('upgrade-insecure-requests', '1');
	request_headers.set('host', url.host);
	
	if(send_cookies){
		let cookies = await get_cookies(server, url);
		if(cookies)request_headers.set('cookie', cookies);
		else request_headers.delete('cookie');
	}else{
		request_headers.delete('cookie');
	}
}

async function handle_common_response(rewriter, server, server_request, url, response){
	const response_headers = new Headers(response.headers);
	
	// server.tomp.log.debug(url, response_headers);

	// whitelist headers soon?

	for(let remove of remove_csp_headers)response_headers.delete(remove);
	for(let remove of remove_general_headers)response_headers.delete(remove);
	
	if('set-cookie' in response.json_headers){
		load_setcookies(server, url, response.json_headers['set-cookie']);
	}
	
	response_headers.set('referrer-policy', 'same-origin') ;
	
	const will_redirect = response.status >= 300 && response.status < 400 || response.status == 201;

	// CONTENT-LOCATION WHAT
	if(will_redirect && response_headers.has('location')){
		let location = response_headers.get('location');
		// if new URL() fails, no redirect
		
		let evaluated;

		try{
			evaluated = new URL(location, url);
			response_headers.set('location', rewriter.serve(evaluated.href, url));
		}catch(err){
			console.error('failure', err);
			response_headers.delete('location');
		}
	}
	
	return response_headers;
}

async function get_data(server, server_request, field){
	const request_headers = new Headers(server_request.headers);
	
	const url = server.tomp.url.unwrap(field);
	
	await handle_common_request(server, server_request, request_headers, url);
	
	return {
		gd_error: false,
		url,
		request_headers,
	};
}

export async function SendBinary(server, server_request, field){
	const {gd_error,url,request_headers} = await get_data(server, server_request, field);
	if(gd_error)return gd_error;
	
	const exact_request_headers = Object.setPrototypeOf(Object.fromEntries(request_headers.entries()), null);

	if(server_request.headers.has('x-tomp-impl-names')){
		MapHeaderNamesFromArray(JSON.parse(server_request.headers.get('x-tomp-impl-names')), exact_request_headers);
		delete exact_request_headers['x-tomp-impl-names'];
	}
	
	try{
		var response = await TOMPFetch(server, url, server_request, exact_request_headers);
	}catch(err){
		if(err instanceof TOMPError)return server.send_json(err.status, err.message);
		else throw err;
	}
	const response_headers = await handle_common_response(server.tomp.binary, server, server_request, url, response);
	
	var exact_response_headers = Object.setPrototypeOf(Object.fromEntries([...response_headers.entries()]), null);
	MapHeaderNamesFromArray(response.raw_header_names, exact_response_headers);
	
	if(status_empty.includes(+response.status)){
		return new Response({
			headers: exact_response_headers,
			status: response.status,
			statusText: response.statusText,
		});
	}else{
		return new Response(response.body, {
			headers: exact_response_headers,
			status: response.status,
			statusText: response.statusText,
		});
	}
}

async function SendRewrittenScript(rewriter, server, server_request, field, ...args){
	const {gd_error,url,request_headers} = await get_data(server, server_request, field);
	if(gd_error)return gd_error;
	
	try{
		var response = await TOMPFetch(server, url, server_request, request_headers);
	}catch(err){
		if(err instanceof TOMPError)return server.send_json(err.status, err.body);
		else throw err;
	}
	const response_headers = await handle_common_response(rewriter, server, server_request, url, response);
	
	var send = new Uint8Array();

	if(status_empty.includes(+response.status)){
		return new Response({
			headers: response_headers,
			status: response.status,
			statusText: response.statusText,
		});
	}else{
		for(let remove of remove_encoding_headers)response_headers.delete(remove);

		return new Response(rewriter.wrap(await response.text(), url.toString(), ...args), {
			headers: response_headers,
			status: response.status,
			statusText: response.statusText,
		});
	}
}

export async function SendJS(server, server_request, field){
	return await SendRewrittenScript(server.tomp.js, server, server_request, field);
}

export async function SendCSS(server, server_request, field){
	return await SendRewrittenScript(server.tomp.css, server, server_request, field);
}

export async function SendManifest(server, server_request, field){
	return await SendRewrittenScript(server.tomp.manifest, server, server_request, field);
}

export async function SendHTML(server, server_request, field){
	const {gd_error,url,request_headers} = await get_data(server, server_request, field);
	if(gd_error)return gd_error;
	
	try{
		var response = await TOMPFetch(server, url, server_request, request_headers);
	}catch(err){
		if(err instanceof TOMPError)return server.send_json(err.status, err.body);
		else throw err;
	}
	const response_headers = await handle_common_response(server.tomp.html, server, server_request, url, response);

	var send = new Uint8Array();
	if(!status_empty.includes(+response.status)){
		if(html_types.includes(get_mime(response_headers.get('content-type') || ''))){
			send = server.tomp.html.wrap(await response.text(), url.toString());
			for(let remove of remove_encoding_headers)response_headers.delete(remove);
		}else{
			send = response.body;
		}
	}
	for(let remove of remove_html_headers)response_headers.delete(remove);

	if(response_headers.has('refresh')){
		response_headers.set('refresh', server.tomp.html.wrap_http_refresh(response_headers.get('refresh'), url));
	}
	
	return new Response(send, {
		headers: response_headers,
		status: response.status,
		statusText: response.statusText,
	});
}


export async function SendForm(server, server_request, field){
	const headers = new Headers();

	const search_ind = field.indexOf('?');
	if(search_ind == -1)return void server.send_json(400, { message: messages['error.badform.get'] });
	const search = field.slice(search_ind);
	field = field.slice(0, search_ind);
	
	const {gd_error,url} = await get_data(server, server_request, field);
	if(gd_error)return gd_error;
	
	const orig_search_ind = url.path.indexOf('?');
	
	url.path = url.path.slice(0, orig_search_ind == -1 ? url.length : orig_search_ind) + search;
	headers.set('location', server.tomp.html.serve(url.toString()));
	// server.tomp.html.serve(updated, updated);

	return new Response(new Uint8Array(), {
		headers,
		status: 302,
	});
}