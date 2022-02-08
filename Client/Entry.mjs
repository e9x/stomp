import { Client } from './Client.mjs';
import { PageClient } from './PageClient.mjs';
import { WorkerClient } from './WorkerClient.mjs';
import { global_client } from '../RewriteJS.mjs';
import { global } from '../Global.mjs';

global[global_client] = (...args) => {
	let created;

	/*if(typeof ServiceWorkerGlobalScope == 'function' && global instanceof ServiceWorkerGlobalScope){
		created = new WorkerClient(config);
	}else */if(typeof WorkerGlobalScope == 'function' && global instanceof WorkerGlobalScope){
		created = new WorkerClient(...args);
	}else if(typeof Window == 'function' && global instanceof Window){
		created = new PageClient(...args);
	}else{
		throw new Error('Unknown context!');
	}

	Reflect.defineProperty(global, global_client, {
		enumerable: false,
		configurable: false,
		writable: false,
		value: created,
	});
};