import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { getOwnPropertyDescriptors, mirror_attributes, Reflect, wrap_function } from '../RewriteUtil.mjs';

export class FunctionRewrite extends Rewrite {
	global = global.Function;
	global_async = (async _=>_).constructor;
	work(){
		const that = this;
		
		function NewFunction(...args){
			if(args.length !== 0){
				let [ code ] = args.splice(-1, 1);
				code = that.client.tomp.js.wrap(code, that.client.base);
				args.push(code);				
			}

			return new that.global(...args);
		}

		function NewAsyncFunction(...args){
			if(args.length !== 0){
				let code = args.splice(-1, 1);
				code = that.client.tomp.js.wrap(code, that.client.base);
				args.push(code);					
			}

			return new that.global_async(...args);
		}

		mirror_attributes(this.global, NewFunction);
		mirror_attributes(this.global, NewFunction);

		NewFunction.prototype = this.global.prototype;
		NewAsyncFunction.prototype = this.global_async.prototype;
		
		this.proxy = NewFunction;
		this.proxy_async = NewAsyncFunction;
		
		Reflect.defineProperty(this.global.prototype, 'constructor', {
			configurable: true,
			enumerable: false,
			writable: true,
			value: this.proxy,	
		});

		Reflect.defineProperty(this.global_async.prototype, 'constructor', {
			configurable: true,
			enumerable: false,
			writable: true,
			value: this.proxy_async,	
		});

		this.global.prototype.constructor = this.proxy;
		this.global_async.prototype.constructor = this.proxy_async;

		global.Function = this.proxy;
	}
};