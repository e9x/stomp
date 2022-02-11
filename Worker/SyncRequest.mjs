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
	async process(data){
		if(!Array.isArray(data)){
			console.trace('Bad data:', data);
			return ['BAD DATA'];
		}

		const request = new Request(data[0], data[1]);
		
		const response = await new Promise((resolve, reject) => {
			const event = {
				async respondWith(response){
					resolve(await response);
				},
				request,
			};

			if(!this.server.request(event))return reject('Declined');
		});

		return [
			await response.text(),
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