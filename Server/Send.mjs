import http from 'http';
import https from 'https';
import { MapHeaderNamesFromObject, ObjectFromRawHeaders, RawHeaderNames } from '../HeaderUtil.mjs';
import messages from '../Messages.mjs';

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
	
	var response_promise = new Promise((resolve, reject) => {
		try{
			if(url.protocol == 'https:')request_stream = https.request(options, resolve);
			else if(url.protocol == 'http:')request_stream = http.request(options, resolve);
			else return reject(new RangeError(`Unsupported protocol: '${protocol}'`));
			
			request_stream.on('error', reject);
		}catch(err){
			reject(err);
		}
	});
	
	if(request_stream)server_request.pipe(request_stream);
	
	/*if(post_methods.includes(options.method)){
	}
	else{
		request_stream.end();
	}*/

	return await response_promise;
}

function get_data(server, server_request, server_response, query, field){
	const key = server_request.headers['x-tomp$key'];
	
	if(!key){
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
	
	request_headers.host = url.host;

	MapHeaderNamesFromObject(ObjectFromRawHeaders(server_request.rawHeaders), request_headers);

	const response = await Fetch(server_request, request_headers, url);
	const response_headers = Object.setPrototypeOf({}, null);

	for(let header in response.headers){
		if(header == 'content-encoding' || header == 'x-content-encoding')response_headers['content-encoding'] = response.headers[header];
		else if(header == 'content-length')response_headers['content-length'] = response.headers[header];
		else response_headers['x-$' + header] = JSON.stringify(response.headers[header]);
	}


	response_headers['x-tomp$raw'] = JSON.stringify(RawHeaderNames(response.rawHeaders));

	response_headers['x-tomp$status'] = response.statusCode.toString(16);

	server_response.writeHead(200, response_headers);
	response.pipe(server_response);
}