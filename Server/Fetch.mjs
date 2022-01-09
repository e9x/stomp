import http from 'http';
import https from 'https';
import {DecompressResponseBody, ReadStream} from './HTTPUtil.mjs'

// max of 4 concurrent sockets, rest is queued while busy
// const http_agent = http.Agent();
// const https_agent = https.Agent();

export async function Fetch(server_request, input, stream = false){
	const url = new URL(input);

	const options = {
		url: url.href,
		hostname: url.host,
		port: url.port,
		path: url.href.substr(url.origin.length), // include query
		method: server_request.method,
	};
	
	console.log('request');

	var request_stream;
	
	if(url.protocol == 'https:')var response_promise = new Promise(resolve => request_stream = https.request(options, resolve));
	else if(url.protocol == 'http:')var response_promise =  new Promise(resolve => request_stream = http.request(options, resolve));
	else throw new RangeError(`Unsupported protocol: '${url.protocol}'`);

	if(options.method == 'POST'){
		request_stream.pipe(server_request);
		// const body = await ReadStream(request_stream);
	}
	else{
		request_stream.end();
	}

	const response = await response_promise;
	
	if(stream){
		return { status: response.statusCode, headers: response.headers, stream: response }
	}else{
		const body = await DecompressResponseBody(response);
		return { status: response.statusCode, headers: response.headers, body }
	}
}