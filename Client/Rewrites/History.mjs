import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { Reflect, wrap_function } from '../RewriteUtil.mjs';

export class HistoryRewrite extends Rewrite {
	global = global.History;
	handler(target, that, args){
		if(args.length < 2){
			throw new TypeError(`Failed to execute '${target.name}' on 'History': 2 arguments required, but only ${args.length} present.`);
		}

		let [data, title, url] = args;
		
		if(url != undefined){
			url = String(url);
			url = this.client.tomp.html.serve(new URL(url, this.client.base), this.client.base);
		}
		
		return Reflect.apply(target, that, [ data, title, url ]);
	}
	work(){
		this.global.prototype.pushState = wrap_function(this.global.prototype.pushState, this.handler.bind(this));
		this.global.prototype.replaceState = wrap_function(this.global.prototype.replaceState, this.handler.bind(this));
	}
};