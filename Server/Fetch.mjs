import http from 'http';
import https from 'https';

// max of 4 concurrent sockets, rest is queued while busy? set max to 75
// const http_agent = http.Agent();
// const https_agent = https.Agent();

export async function Fetch(server_request, request_headers, input){
	const url = new URL(input);

	request_headers.host = url.hostname;

	const options = {
		url: url.href,
		hostname: url.host,
		port: url.port,
		path: url.pathname + url.search, // include query
		method: server_request.method,
		headers: request_headers,
	};
	
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

	return await response_promise;
}