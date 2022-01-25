import { Client } from './Client.mjs';
import { PageClient } from './PageClient.mjs';
import { global_client } from '../RewriteJS.mjs';
import { global } from '../Global.mjs';

window[global_client] = config => {
	let created;

	if(typeof ServiceWorkerGlobalScope == 'function' && self instanceof ServiceWorkerGlobalScope){
		created = new Client(config);
	}else if(typeof WorkerGlobalScope == 'function' && self instanceof WorkerGlobalScope){
		created = new Client(config);
	}else if(typeof Window == 'function' && self instanceof Window){
		created = new PageClient(config);
	}else{
		throw new Error('Unknown context!');
	}

	Object.defineProperty(global, global_client, {
		enumerable: false,
		configurable: false,
		writable: false,
		value: created,
	});
};
