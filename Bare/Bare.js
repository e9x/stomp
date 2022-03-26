// Implements the protocol for requesting bare data from a server
// See ../Server/Send.mjs

export * from './Client.js';
import ClientV1 from './V1.js';
import ClientV2 from './V2.js';

export default class Bare {
	#ready;  
	constructor(tomp, server, json){
		this.tomp = tomp;
		this.server = new URL(server, this.tomp.origin);
		this.#ready = this.#work(json);
	}
	async #work(json){
		if(json === undefined){
			const outgoing = await fetch(this.server);

			if(!outgoing.ok){
				throw new Error(`Unable to fetch Bare meta: ${outgoing.status} ${await outgoing.text()}`);
			}

			json = await outgoing.json();

			this.tomp.bare_json = json;
		}
		
		let found = false;

		// newest-oldest
		for(let constructor of [ ClientV2, ClientV1 ]){
			if(json.versions.includes(`v${constructor.version}`)){
				this.client = new constructor(this);
				found = true;
				break;
			}
		}

		if(!found){
			throw new Error(`Unable to find compatible client version.`);
		}
	}
	async fetch(...args){
		await this.#ready;
		return this.client.fetch(...args);
	}
	async connect(...args){
		await this.#ready;
		return this.client.connect(...args);
	}
};