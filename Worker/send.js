import { forbids_body, status_empty } from '../Bare.js';
import { mapHeaderNamesFromArray } from './HeaderUtil.js'
import { html_types, get_mime } from '../RewriteElements.js';
import { load_setcookies, get_cookies } from './Cookies.js';

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

async function handle_common_request(server, server_request, request_headers, url){
	//req.referrer
	if(server_request.headers.has('referer')){
		const ref = new URL(server_request.headers.get('referer'));
		const {service,field} = server.tomp.url.get_attributes(ref.pathname);

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

	if(url.protocol == 'http:'){
		request_headers.set('upgrade-insecure-requests', '1');
	}
	
	request_headers.set('host', url.host);
	
	if(send_cookies){
		const cookies = await get_cookies(server, url);

		if(cookies.length > 0){
			request_headers.set('cookie', cookies.toString());
		}else{
			request_headers.delete('cookie');
		}
	}else{
		request_headers.delete('cookie');
	}
}

async function sendGetCookies(server, server_request){
	const url = new URL(server_request.url);
	const remote = JSON.parse(url.searchParams.get('remote'));
	const json = url.searchParams.has('json');
	const cookies = await get_cookies(server, remote);
	
	if(json){
		return new Response(JSON.stringify(cookies), {
			headers: {
				'content-type': 'application/json',
			},
		});
	}else{
		return new Response(cookies.toString(), {
			headers: {
				'content-type': 'text/plain',
			},
		})
	}
}

async function sendSetCookies(server, server_request){
	const url = new URL(server_request.url);
	const remote = JSON.parse(url.searchParams.get('remote'));
	const set_cookies = url.searchParams.get('cookies');
	
	await load_setcookies(server, remote, set_cookies);

	return new Response(undefined,  {
		status: 200,
	});
}

import * as CookieStore from './CookieStore.js';

async function sendCookieStore(server, server_request){
	const url = new URL(server_request.url);
	const func = url.searchParams.get('func');
	const args = JSON.parse(url.searchParams.get('args'));
	
	if(!(func in CookieStore)){
		console.warn('Unknown function:', func);
		return server.json(400);
	}

	try{
		return server.json(200, await CookieStore[func](server, ...args));
	}catch(err){
		console.error(err);
		return server.json(500, { message: err.message });
	}
}

import * as Storage from './Storage.js';

async function sendStorage(server, server_request){
	const url = new URL(server_request.url);
	const func = url.searchParams.get('func');
	const args = JSON.parse(url.searchParams.get('args'));
	
	if(!(func in Storage)){
		console.warn('Unknown function:', func);
		return server.json(400);
	}

	try{
		return server.json(200, await Storage[func](server, ...args));
	}catch(err){
		console.error(err);
		return server.json(500, { message: err.message });
	}
}

async function handle_common_response(rewriter, server, server_request, url, response, ...args){
	const response_headers = new Headers(response.headers);
	
	// server.tomp.log.debug(url, response_headers);

	// whitelist headers soon?

	for(let remove of remove_csp_headers)response_headers.delete(remove);
	for(let remove of remove_general_headers)response_headers.delete(remove);
	
	if('set-cookie' in response.json_headers){
		await load_setcookies(server, url, response.json_headers['set-cookie']);
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
			response_headers.set('location', rewriter.serve(evaluated.href, url, ...args));
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
	
	let body = undefined;

	if(!forbids_body.includes(server_request.method)){
		// https://developer.mozilla.org/en-US/docs/Web/API/Request/body#browser_compatibility
		body = await server_request.blob();
	}

	return {
		gd_error: false,
		url,
		body,
		request_headers,
	};
}

export async function sendBinary(server, server_request, field){
	const {gd_error,url,request_headers,body} = await get_data(server, server_request, field);
	if(gd_error)return gd_error;
	
	const exact_request_headers = Object.fromEntries(request_headers.entries());
	
	Reflect.setPrototypeOf(exact_request_headers, null);

	if(server_request.headers.has('x-tomp-impl-names')){
		mapHeaderNamesFromArray(JSON.parse(server_request.headers.get('x-tomp-impl-names')), exact_request_headers);
		delete exact_request_headers['x-tomp-impl-names'];
	}
	
	const response = await server.tomp.bare.fetch(server_request.method, exact_request_headers, body, url.protocol, url.host, url.port, url.path);
	
	const response_headers = await handle_common_response(server.tomp.binary, server, server_request, url, response);
	
	let exact_response_headers = Object.fromEntries([...response_headers.entries()]);
	Reflect.setPrototypeOf(exact_request_headers, null);
	
	mapHeaderNamesFromArray(response.raw_header_names, exact_response_headers);
	
	if(status_empty.includes(+response.status)){
		return new Response(undefined, {
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

async function sendRewrittenScript(rewriter, server, server_request, field, ...args){
	const {gd_error,url,request_headers,body} = await get_data(server, server_request, field);
	if(gd_error)return gd_error;
	
	const response = await server.tomp.bare.fetch(server_request.method, request_headers, body, url.protocol, url.host, url.port, url.path);
	const response_headers = await handle_common_response(rewriter, server, server_request, url, response, ...args);
	
	if(status_empty.includes(+response.status)){
		return new Response({
			headers: response_headers,
			status: response.status,
			statusText: response.statusText,
		});
	}else{
		for(let remove of remove_encoding_headers)response_headers.delete(remove);

		const text = await response.text();

		const wrapped = rewriter.wrap(text, url.toString(), ...args);

		return new Response(wrapped, {
			headers: response_headers,
			status: response.status,
			statusText: response.statusText,
		});
	}
}

async function sendJS(server, server_request, field,){
	return await sendRewrittenScript(server.tomp.js, server, server_request, field);
}

async function sendWJS(server, server_request, field, worker){
	return await sendRewrittenScript(server.tomp.js, server, server_request, field, true);
}

async function sendCSS(server, server_request, field){
	return await sendRewrittenScript(server.tomp.css, server, server_request, field);
}

async function sendManifest(server, server_request, field){
	return await sendRewrittenScript(server.tomp.manifest, server, server_request, field);
}

async function sendSVG(server, server_request, field){
	return await sendRewrittenScript(server.tomp.svg, server, server_request, field);
}

async function sendHTML(server, server_request, field){
	const {gd_error,url,request_headers,body} = await get_data(server, server_request, field);
	if(gd_error)return gd_error;
	
	const response = await server.tomp.bare.fetch(server_request.method, request_headers, body, url.protocol, url.host, url.port, url.path);
	const response_headers = await handle_common_response(server.tomp.html, server, server_request, url, response);

	let send = undefined;
	
	if(!status_empty.includes(+response.status)){
		const mime = get_mime(response_headers.get('content-type') || '');
		
		if(html_types.includes(mime)){
			if(mime === ''){
				response_headers.set('content-type', 'text/html');
			}

			send = server.tomp.html.wrap(await response.text(), url.toString());
			
			for(let remove of remove_encoding_headers){
				response_headers.delete(remove);
			}
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

async function sendForm(server, server_request, field){
	const headers = new Headers();

	if(server_request.method === 'POST'){
		const {gd_error,url} = await get_data(server, server_request, field);
		if(gd_error)return gd_error;
		
		headers.set('location', server.tomp.html.serve(url, url));
		
		return new Response(undefined,  {
			headers,
			status: 307,
		});
	}

	const search_ind = field.indexOf('?');
	
	if(search_ind === -1){
		const {gd_error,url} = await get_data(server, server_request, field);
		if(gd_error)return gd_error;

		headers.set('location', server.tomp.html.serve(url, url));
	}else{
		const search = field.slice(search_ind);
		field = field.slice(0, search_ind);
		
		const {gd_error,url} = await get_data(server, server_request, field);
		if(gd_error)return gd_error;
		
		const orig_search_ind = url.path.indexOf('?');
		
		url.path = url.path.slice(0, orig_search_ind == -1 ? url.length : orig_search_ind) + search;
		headers.set('location', server.tomp.html.serve(url, url));
	}
	
	// https://stackoverflow.com/questions/14935090/how-to-preserve-request-body-on-performing-http-redirect-from-servlet-filter
	return new Response(undefined, {
		headers,
		status: 307,
	});
}

async function process(server, server_request, field){
	let [service,url] = field.split(':');
	url = decodeURIComponent(url);
	service = decodeURIComponent(service);

	if(!(service in server.tomp)){
		return new Response(undefined, {
			sttus: 400,
		});
	}

	return new Response(undefined, {
		headers: {
			location: server.tomp[service].serve(url, url),
		},
		status: 307,
	});
}

export default async function register(server){
	// process, sendCookieStore, sendGetCookies, sendSetCookies, sendBinary, sendForm, sendHTML, sendSVG, sendJS, sendCSS, sendManifest, sendStorage
	server.routes.set('get-cookies', sendGetCookies);
	server.routes.set('set-cookies', sendSetCookies);
	server.routes.set('cookiestore', sendCookieStore);
	server.routes.set('storage', sendStorage);
	server.routes.set('process', process);
	server.routes.set('binary', sendBinary);
	server.routes.set('form', sendForm);
	server.routes.set('html', sendHTML);
	server.routes.set('svg', sendSVG);
	server.routes.set('js', sendJS);
	server.routes.set('wjs', sendWJS);
	server.routes.set('css', sendCSS);
	server.routes.set('manifest', sendManifest);
}