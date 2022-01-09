import { Fetch } from './Fetch.mjs';

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
	
	data = data.replace(/client_information/g, JSON.stringify(server.tomp));

}

export async function SendBinary(server, request, response, field){
	const url = server.tomp.wrap.unwrap(decodeURIComponent(field), server.get_key(request));
			
	const { status, headers, stream } = await Fetch(request, url);
	
	response.writeHead(status, headers);
	response.pipe(stream);
}

export async function SendHTML(server, request, response, field){
	const url = server.tomp.wrap.unwrap(decodeURIComponent(field), server.get_key(request));
	
	const { status, headers, body } = await Fetch(request, url);
	const send = body;

	server.tomp.log.info('Proxy:', url);

	headers['content-length'] = send.byteLength;
	delete headers['content-encoding'];
	delete headers['x-content-encoding'];
	
	response.writeHead(status, headers);
	response.write(send);
	response.end();
}