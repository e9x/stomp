import cookie from 'cookie';
import { DecodePOSTStream } from './HTTPUtil.mjs'
import { global_client } from '../RewriteJS.mjs';

export async function Process(server, request, response){
	const body = await DecodePOSTStream(request, request.headers['content-type']);
	
	if(typeof body.input != 'string'){
		return server.send_json(response, 400, { error: 'body.input was not a string' })
	}

	const headers = Object.setPrototypeOf({}, null);

	// const redirect = server.tomp.html.serve(body.input, body.input, key);
	// headers['refresh'] = `0;${redirect}`;
	let send = Buffer.from(`<!DOCTYPE HTML>
<html>
	<head>
		<meta charset="utf-8" />
	</head>
	<body>
		<form id='ready' action=${JSON.stringify(server.tomp.prefix + 'about:/]/process/')}' method='POST'>
			<input style='visibility:hidden' type='text' value=${JSON.stringify(body.input)} name='input'></input>
		</form>
		<script src=${JSON.stringify(server.tomp.prefix + 'about:/]/static/worker_register.js')}></script>
		<script>window.${global_client}=new ${global_client}(${JSON.stringify(server.tomp)});${global_client}.work().then(()=>ready.submit())</script>
	</body>
</html>`);

	headers['content-type'] = 'text/html';
	headers['content-length'] = send.byteLength;
	response.writeHead(200, headers);
	response.end(send);
}