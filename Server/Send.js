import cookie from 'cookie';
import { DecodePOSTStream } from './HTTPUtil.mjs'
import { global_client } from '../RewriteJS.mjs';

const whitespace = /\s/;
const http_s_protocol = /^https?:\/\//;

export async function Process(server, request, response){
	const body = await DecodePOSTStream(request, request.headers['content-type']);
	
	if(typeof body.input != 'string'){
		return server.send_json(response, 400, { error: 'body.input was not a string' })
	}

	if(body.input.includes('.') && !body.input.match(http_s_protocol)){
		body.input = `http://${body.input}`;
	}else if(body.input.match(whitespace) || !body.input.match(http_s_protocol)) {
		body.input = `https://www.google.com/search?q=${encodeURIComponent(body.input)}`;
	}
	
	const headers = Object.setPrototypeOf({}, null);

	// override tomp$key for security purposes
	
	const cookies = typeof request.headers.cookie == 'string' ? cookie.parse(request.headers.cookie) : {};

	const key = cookies.tomp$key || server.tomp.codec.generate_key();

	headers['set-cookie'] = server.get_setcookie(key);
	
	// const redirect = server.tomp.html.serve(body.input, body.input, key);
	// headers['refresh'] = `0;${redirect}`;
	let send = Buffer.from(`<!DOCTYPE HTML>
<html>
	<head>
		<meta charset="utf-8" />
	</head>
	<body>
		<script src=${JSON.stringify(server.tomp.prefix)}></script>
		<script>window.${global_client}=new ${global_client}(${JSON.stringify(this.tomp)},${JSON.stringify(key)})</script>
	</body>
</html>`);

	headers['service-worker-allowed'] = server.tomp.prefix;
	headers['content-type'] = 'text/html';
	headers['content-length'] = send.byteLength;
	response.writeHead(200, headers);
	response.end(send);
}