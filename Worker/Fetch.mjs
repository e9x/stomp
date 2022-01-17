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

	if(post_methods.includes(options.method)){
		server_request.pipe(request_stream);
	}
	else{
		request_stream.end();
	}

	return await response_promise;
}