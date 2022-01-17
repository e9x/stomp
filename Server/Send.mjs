import http from 'http';
import https from 'https';

// max of 4 concurrent sockets, rest is queued while busy? set max to 75
// const http_agent = http.Agent();
// const https_agent = https.Agent();

const post_methods = ['PATCH','POST','PUT'];

export async function Fetch(server_request, request_headers, url){
	const options = {
		host: url.host,
		port: url.port,
		path: url.path,
		method: server_request.method,
		headers: request_headers,
	};
	
	var request_stream;
	
	if(url.protocol == 'https:')var response_promise = new Promise((resolve, reject) => request_stream = https.request(options, resolve).on('error', reject));
	else if(url.protocol == 'http:')var response_promise =  new Promise((resolve, reject) => request_stream = http.request(options, resolve).on('error', reject));
	else throw new RangeError(`Unsupported protocol: '${protocol}'`);

	server_request.pipe(request_stream);
	
	/*if(post_methods.includes(options.method)){
	}
	else{
		request_stream.end();
	}*/

	return await response_promise;
}

function get_data(server, server_request, server_response, query, field){
	const key = server.get_key(server_request);
	
	if(!key){
		server.send_json(server_response, 400, { message: server.messages['error.nokey'] });
		server.send_json(server_response, 400, { message: messages['error.nokey'] });
		return { gd_error: true };
	}

	const request_headers = {...server_request.headers};
	const url = server.tomp.url.unwrap(query, field, key);
	
	return {
		gd_error: false,
		url,
		key,
		request_headers,
	};
}

export async function SendBare(server, server_request, server_response, query, field){
	const {gd_error,url,key,request_headers} = get_data(server, server_request, server_response, query, field);
	if(gd_error)return;
	
	const response = await Fetch(server_request, request_headers, url);
	const response_headers = Object.setPrototypeOf({}, null);

	for(let header in response.headers){
		response_headers['x-$' + header] = JSON.stringify(response.headers[header]);
	}

	response_headers['x-status$'] = response.statusCode.toString(16);

	server_response.writeHead(200, response_headers);
	response.pipe(server_response);
}