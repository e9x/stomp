import { Client } from './Client.mjs';
import { Reflect, wrap_function } from './RewriteUtil.mjs';
import { global } from '../Global.mjs';

export class WorkerClient extends Client {
	static type = 'worker';
	base = this.tomp.url.parse_url(this.tomp.url.unwrap_ez(location));
	host = this.tomp.url.parse_url(location.href);
	constructor(config){
		super(config);
		
		this.work_modules();
	}
	work_modules(){
		super.work_modules();

		/* script url isnt relative to the imported script
		relative to the creation url scope
		*/
		global.importScripts = wrap_function(global.importScripts, (target, that, scripts) => {
			for(let i = 0; i < scripts.length; i++){
				scripts[i] = this.tomp.js.serve(new URL(scripts[i], this.location.proxy), this.location.proxy, true);
			}

			return Reflect.apply(target, that, scripts);
		});
	}
};