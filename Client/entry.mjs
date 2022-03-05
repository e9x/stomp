import PageClient from './Page/Client.mjs';
import WorkerClient from './Worker/Client.mjs';
import global from './global.mjs';
import { global_client } from '../RewriteJS.mjs';
import { is_page, is_worker } from './environment.mjs';

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

	created.work();

	Reflect.defineProperty(global, global_client, {
		enumerable: false,
		configurable: false,
		writable: false,
		value: created,
	});
}

// consider iframes
if(!(global_client in global)){
	global[global_client] = create_instance;
}