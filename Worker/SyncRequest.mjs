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
		console.log(data);

		const request = new Request(data[0], data[1]);
		
		const response = await fetch(request);

		return [
			response.url,
			{
				status: response.status,
				statusText: response.statusText,
				headers: Object.fromEntries(response.headers.entries()),
				url: response.url,
			},
			await response.text(),
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
				
				console.log('Sending:', response);

				cookie.value = encodeURIComponent(JSON.stringify(['incoming', response]));
				cookieStore.set(cookie);
			}
		});
	}
};