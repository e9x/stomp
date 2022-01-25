import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { Reflect, wrap_function } from '../RewriteUtil.mjs';

export class AccessRewrite extends Rewrite {
	work(){
		global.Reflect.get = wrap_function(global.Reflect.get, (target, that, args) => {
			let result = Reflect.apply(target, that, args);
			result = this.get(result);
			return result;
		});
		
		global.Reflect.set = wrap_function(global.Reflect.set, (target, that, [ obj, prop, value ]) => {
			let result = Reflect.apply(target, that, [ obj, prop, this.set(Reflect.get(obj, prop), value) ]);
			result = this.get(result);
			return result;
		});
		
		const get_desc = (target, that, [ obj, prop ]) => {
			if(obj == global && prop == 'location')return {...this.client.location.description};
			if(this.client.constructor.type == 'page' && obj == global.document && prop == 'location')return {...this.client.location.description_document};
			
			let result = Reflect.apply(target, that, [ obj, prop ]);
			result = this.get(result);
			return result;
		};
		
		const reflect_desc = global.Reflect.getOwnPropertyDescriptor = wrap_function(global.Reflect.getOwnPropertyDescriptor, get_desc);
		
		global.Object.getOwnPropertyDescriptor = wrap_function(global.Object.getOwnPropertyDescriptor, get_desc);

		global.Object.getOwnPropertyDescriptors = wrap_function(global.Object.getOwnPropertyDescriptors, (target, that, [ obj ]) => {
			let result = Reflect.apply(target, that, [ obj ]);

			if(obj == global && 'location' in result){
				result.location = reflect_desc(global, 'location');
			}

			return result;
		});
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
		
		return value;
	}
};