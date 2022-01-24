import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { global_client } from '../../RewriteJS.mjs';

export class AccessRewrite extends Rewrite {
	get_prop(obj, key) {
		if (!this.client.service_worker && global != global.top && obj == global.top) {
			return global.top[global_client].access.get$m(obj, key);
		}
		
		if (obj == global && key == 'location' || !this.client.service_worker && obj == global.document && key == 'location') {
			return this.client.location.proxy;
		}
		
		if (!this.client.service_worker && obj == global && key == 'top' && global != global.top) {
			return global.top;
		}
		
		return obj[key];
    }
    set_prop(obj, key, val) {
		if(obj[key] == this.client.location.global){
			val = this.client.tomp.html.serve(val, this.client.location);
		}

		/*if(!this.client.service_worker && global != global.top && obj == global.top){
			return global.top[global_client].access.set$(global.top, val, operator);
		}*/

		return val;
    }
    call_prop(obj, key, args){
        if(!this.client.service_worker && global != global.top && obj == global.top){
			return this.top[global_client].access.call_prop(global.top, key, args);
		}

		return obj[key](...args);
    }
    get(obj){
		if(obj == this.client.eval.global)return this.client.eval.eval_global_proxy;
		if(obj == this.client.location.global)return this.client.location.proxy;
		if(!this.client.service_worker && obj == global.top)return global.top;
        return obj;
    }
    set(target, value){
		if(target == this.client.location.global){
			value = this.client.tomp.html.serve(new URL(value, this.client.location.proxy), this.client.location.proxy);
		}

		/*if(!this.client.service_worker && global != global.top && target == global.top){
			return global.top[global_client].access.set$(global.top, value, operator);
		}*/
		
		return value;
	}
};