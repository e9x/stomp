import cookie from 'cookie';

const whitespace = /\s/;
const http_s_protocol = /^https?:\/\//;

async function DecodePOST(request){
	const decoded = {};

	Object.setPrototypeOf(decoded, null);

	const body = await request.text();

	try{
		switch(request.headers.get('content-type')){
			case'application/x-www-form-urlencoded':
				Object.assign(decoded, Object.fromEntries([...new URLSearchParams(body).entries()]));
				break;
			case'application/json':
				Object.assign(decoded, JSON.parse(body));
				break;
		}
	}catch(err){
		console.error(err);
		// error is only caused by intentionally bad body
	}
	
	return decoded;
}

export async function Process(server, request, response){
	const body = await DecodePOST(request);
	
	if(typeof body.input != 'string'){
		return server.send_json(response, 400, { error: 'body.input was not a string' })
	}

	if(body.input.includes('.') && !body.input.match(http_s_protocol)){
		body.input = `http://${body.input}`;
	}else if(body.input.match(whitespace) || !body.input.match(http_s_protocol)) {
		body.input = `https://www.google.com/search?q=${encodeURIComponent(body.input)}`;
	}
	
	const headers = new Headers();

	// override tomp$key for security purposes
	
	const cookies = typeof request.headers.cookie == 'string' ? cookie.parse(request.headers.cookie) : {};

	const redirect = server.tomp.html.serve(body.input, body.input, server.key);
	headers.set('refresh', `0;${redirect}`);
	headers.set('content-type', 'text/html');
	return new Response(new Uint8Array(), { headers, status: 200 });
}