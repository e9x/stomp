import { decodeBase64, encodeBase64 } from '../Base64.js';
import { encodeCookie } from '../encodeCookies.js'
import { status_redirect } from '../Worker/bare.js';

export default class SyncServer {
	constructor(server){
		this.server = server;

		this.server.routes.set('sync-request', async (server, request, field) => await this.sync_request.route(request));
	}
	async route(request){
		return new Response(JSON.stringify(await this.process(await request.json())), {
			headers: {
				'content-type': 'application/json',
			},
		});
	}
	async on_message({ id, args }){
		const response = await this.process(JSON.parse(JSON.stringify(args)));
		
		const long = encodeCookie(JSON.stringify(response));
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
		
		encodeCookie(JSON.stringify(response));

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
			options.body = decodeBase64(body);
		}


		let redirects = 15;
		let response;

		for(;;){
			if(redirects-- <= 0){
				return [
					{
						message: 'too many redirects',
					}
				];
			}

			const request = new Request(url, options);
			
			try{
				response = await new Promise((resolve, reject) => {
					const event = {
						async respondWith(response){
							resolve(await response);
						},
						request,
					};
		
					if(!this.server.request(event)){
						reject('Declined');
					}
				});
			}catch(error){
				return [
					{
						message: String(error),
					},
				];
			}
			
			if(status_redirect.includes(response.status) && response.headers.has('location')){
				url = new URL(response.headers.get('location'), url);
				continue;
			}

			break;
		}
		
		return [
			undefined,
			encodeBase64(await response.arrayBuffer()),
			{
				status: response.status,
				statusText: response.statusText,
				headers: Object.fromEntries(response.headers.entries()),
			},
			response.url,
		];
	}
};