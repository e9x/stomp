import { PageClient } from './PageClient.mjs';
import { WorkerClient } from './WorkerClient.mjs';
import { global_client } from '../RewriteJS.mjs';
import { global } from '../Global.mjs';
import { is_page, is_worker, is_serviceworker } from '../Environment.mjs';

if(global_client in global){
	throw new Error('TOMP client already loaded!');
}

function create_instance(...args){
	let created;

	/*if(is_serviceworker){
		created = new WorkerClient(config);
	}else */if(is_worker){
		created = new WorkerClient(...args);
	}else if(is_page){
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
}

global[global_client] = create_instance;