import { decode_base64, encode_base64 } from '../Base64.mjs';
import { engine } from '../UserAgent.mjs';

export class SyncRequest {
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
	work(){
		if(engine == 'gecko')return;
		
		cookieStore.addEventListener('change', async event => {
			for(let cookie of event.changed){
				if(!cookie.name.startsWith('sync-request-'))continue;
				
				if(!cookie.value)continue;

				const [ name, data ] = JSON.parse(decodeURIComponent(cookie.value));
				
				if(name != 'outgoing')continue;
				
				const response = await this.process(data);
				
				// console.log('Sending:', response);

				cookie.value = encodeURIComponent(JSON.stringify(['incoming', response]));
				cookieStore.set(cookie);
			}
		});
	}
};