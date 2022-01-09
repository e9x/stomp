import cookie from 'cookie';
import { DecodeRequestBody } from './HTTPUtil.mjs'

const whitespace = /\s/;
const http_s_protocol = /^https?:\/\//;

export async function Process(server, request, response){
	const body = await DecodeRequestBody(request);
	
	if(typeof body.input != 'string'){
		return server.send_json(response, 400, { error: 'body.input was not a string' })
	}

	if(body.input.includes('.') && !body.input.match(http_s_protocol)){
		body.input = `http://${body.input}`;
	}else if(!body.input.match(http_s_protocol)) {
		body.input = `https://www.google.com/search?q=${encodeURIComponent(body.input)}`;
	}
	
	const headers = {};

	const cookies = typeof request.headers.cookie == 'string' ? cookie.parse(request.headers.cookie) : {};

	// override tomp$key for security purposes
	
	const key = server.tomp.url.generate_key();

	cookies.tomp$key = key;

	headers['set-cookie'] = cookie.serialize('tomp$key', key, {
		maxAge: 60 * 60 * 2, // 2 hours
	});
	
	const redirect = '/tomp/html/' + encodeURIComponent(server.tomp.url.wrap(body.input, cookies.tomp$key));
	const send = Buffer.from(`<!DOCTYPE HTML><html><head><meta charset='utf-8' /><meta http-equiv="refresh" content=${JSON.stringify('0;' + redirect)} /></head><body></body></html>`);
	headers['content-length'] = send.byteLength;
	response.writeHead(200, headers);
	response.write(send);
	response.end();
}