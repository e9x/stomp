import { decode_base64, encode_base64 } from '../Base64.mjs';
import { encode_cookie } from '../EncodeCookies.mjs'
import { engine } from '../Environment.mjs';

export class SyncServer {
	constructor(server){
		this.server = server;
	}
	async route(request){
		return new Response(JSON.stringify(await this.process(await request.json())), {
			headers: {
				'content-type': 'application/json',
			},
		});
	}
	async on_message({ id, args }){
		console.trace('work with', id, args);

		const response = await this.process(JSON.parse(JSON.stringify(args)));
		
		const long = encode_cookie(JSON.stringify(response));
		let chunks = 0;
		const split = 4000;
		
		for(let i = 0; i < long.length; i += split){
			const part = long.slice(i, i + 4000);
		
			const chunk = chunks++;

			await cookieStore.set({
				name: id + chunk,
				value: part,
				maxAge: 10,
				path: '/',
			});
		}
		
		encode_cookie(JSON.stringify(response));

		await cookieStore.set({
			name: id,
			value: chunks,
			maxAge: 10,
			path: '/',
		});
	}
	message(data){
		if(data.sync){
			this.on_message(data);
			return true;
		}else{
			return false;
		}
	}
	async process([ url, options, body ]){
		if(body !== null){
			options.body = decode_base64(body);
		}

		const request = new Request(url, options);
		
		let response;

		try{
			response = await new Promise((resolve, reject) => {
				const event = {
					async respondWith(response){
						resolve(await response);
					},
					request,
				};
	
				if(!this.server.request(event)){
					return reject('Declined');
				}
			});
		}catch(error){
			return [
				error.message,
			];
		}

		return [
			undefined,
			encode_base64(await response.arrayBuffer()),
			{
				status: response.status,
				statusText: response.statusText,
				headers: Object.fromEntries(response.headers.entries()),
				url: response.url,
			},
		];
	}
	work(){}
};