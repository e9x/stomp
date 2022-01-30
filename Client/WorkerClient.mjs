import { Client } from './Client.mjs';
import { Reflect, wrap_function } from './RewriteUtil.mjs';

export class WorkerClient extends Client {
	static type = 'worker';
	constructor(config){
		super(config);
	
		/* script url isnt relative to the imported script
		relative to the creation url scope
		*/
		global.importScripts = wrap_function(global.importScripts, (target, that, scripts) => {
			for(let i = 0; i < scripts.length; i++){
				scripts[i] = this.tomp.url.wrap(scripts[i], this.location.page_url);
			}

			return Reflect.apply(target, that, scripts);
		});
	}
};