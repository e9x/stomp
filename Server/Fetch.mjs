import http from 'http';
import https from 'https';

// max of 4 concurrent sockets, rest is queued while busy? set max to 75
// const http_agent = http.Agent();
// const https_agent = https.Agent();

const post_methods = ['PATCH','POST','PUT'];

export async function Fetch(server_request, request_headers, { protocol, host, port, path }){
	const colon = host.lastIndexOf(':');
	
	request_headers['host'] = host;
	
	const options = {
		host,
		port,
		path, 
		method: server_request.method,
		headers: request_headers,
	};
	
	var request_stream;
	
	if(protocol == 'https:')var response_promise = new Promise((resolve, reject) => request_stream = https.request(options, resolve).on('error', reject));
	else if(protocol == 'http:')var response_promise =  new Promise((resolve, reject) => request_stream = http.request(options, resolve).on('error', reject));
	else throw new RangeError(`Unsupported protocol: '${protocol}'`);

	if(post_methods.includes(options.method)){
		server_request.pipe(request_stream);
		// const body = await ReadStream(request_stream);
	}
	else{
		request_stream.end();
	}

	return await response_promise;
}