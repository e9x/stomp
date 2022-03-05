import Rewrite from '../../Rewrite.mjs';
import global from '../../global.mjs';
import { Reflect, wrap_function } from '../../RewriteUtil.mjs';

export default class ImportScriptsRewrite extends Rewrite {
	global = global.importScripts;
	work(){
		global.importScripts = wrap_function(this.global, (target, that, scripts) => {
			for(let i = 0; i < scripts.length; i++){
				scripts[i] = this.client.tomp.js.serve(new URL(scripts[i], this.client.base), this.client.base, true);
			}

			return Reflect.apply(target, that, scripts);
		});
	}
};