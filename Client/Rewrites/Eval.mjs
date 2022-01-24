import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';

const js_eval = global.eval;

export class EvalRewrite extends Rewrite {
	global(x){
		return js_eval(this.tomp.js.wrap(x, this.client.location.proxy));
	}
	scope(func, call, code, ...args){
		if(func == js_eval){
			return call(this.tomp.js.wrap(code, this.client.location.proxy));
		}else{ // call as if it were eval(the, args, to, non js eval)
			return call(code, ...args);
		}
	}
};