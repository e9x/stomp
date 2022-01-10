import fs from 'fs';

import { Fetch } from './Fetch.mjs';
import { DecompressResponse } from './HTTPUtil.mjs'
import { MapHeaderNames, ObjectFromRawHeaders } from './HeaderUtil.mjs'
import { CompilationPath } from './Compiler.mjs';

// todo: cache
export async function SendScript(server, request, response){
	try{
		const data = await fs.promises.readFile(CompilationPath, 'utf-8');
	}catch(err){
		if(err.code == 'ENOENT'){
			server.send_json(response, 500, { message: server.messages['generic.error.notready'] });
		}else{
			server.send_json(response, 500, { message: server.messages['generic.exception.request'] });
			server.tomp.log.error('Error reading backend compilation:', err);
		}
	}
	
	data = data.replace(/client_information/g, JSON.stringify([
		tomp,
		server.get_key(request),
	]));

}

export async function SendBinary(server, server_request, server_response, field){
	const url = server.tomp.wrap.unwrap(decodeURIComponent(field), server.get_key(server_request));
			
	const request_headers = {...server_request.headers};
	request_headers.host = url.host;
	const response = await Fetch(server_request, request_headers, url);
	
	server_response.writeHead(response.statusCode, headers);
	stream.pipe(server_response);
}

export async function SendHTML(server, server_request, server_response, field){
	const key = server.get_key(server_request);
	const url = server.tomp.wrap.unwrap(decodeURIComponent(field), key);
	
	const request_headers = {...server_request.headers};

	const response = await Fetch(server_request, request_headers, url);
	const send = Buffer.from(server.tomp.html.wrap((await DecompressResponse(response)).toString(), key));
	const send_headers = Object.setPrototypeOf({...response.headers}, null);

	server.tomp.log.debug(url, send_headers);

	delete send_headers['x-frame-options'];
	send_headers['content-length'] = send.byteLength;
	delete send_headers['transfer-encoding'];
	delete send_headers['content-encoding'];
	delete send_headers['x-content-encoding'];
	
	server_response.writeHead(response.statusCode, MapHeaderNames(ObjectFromRawHeaders(response.rawHeaders), send_headers));
	server_response.write(send);
	server_response.end();
}