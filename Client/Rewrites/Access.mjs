import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { Reflect, wrap_function } from '../RewriteUtil.mjs';
import { undefinable, global_client } from '../../RewriteJS.mjs';

export class AccessRewrite extends Rewrite {
	// unique_top = parent !== top && global_client in parent;
	import(meta, url){
		const resolved = new URL(url, meta.url);

		return this.client.tomp.js.serve(resolved, this.client.location.proxy);
	}
	work(){
		if(this.client.type == 'page'){
			this.unique_parent = parent !== global  && global_client in parent;
		}
		
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
			let result = Reflect.apply(target, that, [ obj, prop ]);
			result = this.get_desc(result);
			return result;
		};
		
		const reflect_desc = global.Reflect.getOwnPropertyDescriptor = wrap_function(global.Reflect.getOwnPropertyDescriptor, get_desc);
		
		global.Object.getOwnPropertyDescriptor = wrap_function(global.Object.getOwnPropertyDescriptor, get_desc);

		global.Object.getOwnPropertyDescriptors = wrap_function(global.Object.getOwnPropertyDescriptors, (target, that, [ obj ]) => {
			let result = Reflect.apply(target, that, [ obj ]);

			for(let key of undefinable)if(key in result){
				result[key] = this.get_desc(result[key]);
			}
			
			return result;
		});

		global.Object.entries = wrap_function(global.Object.entries, (target, that, [ obj ]) => {
			let result = Reflect.apply(target, that, [ obj ]);

			for(let pair of result)if(undefinable.includes(pair[0]))pair[1] = this.get(pair[1]);
			
			return result;
		});
		
		global.Object.values = wrap_function(global.Object.values, (target, that, [ obj ]) => {
			let result = Reflect.apply(target, that, [ obj ]);

			for(let i = 0; i < result.length; i++){
				result[i] = this.get(result[i]);
			}

			return result;
		});
	}
	get_desc(desc){
		if(!(desc instanceof Object))return desc;

		if(typeof desc.get === 'function'){
			if(desc.get === this.client.location.global_description.get){
				return {...this.client.location.description};
			}else if(desc.get === this.client.location.global_description_document.get){
				return {...this.client.location.description_document};
			}
		}else if(typeof desc.value === 'function'){
			if(desc.value === this.client.eval.global_description.value){
				return {...this.client.eval.description};
			}
		}

		if(this.unique_parent)return parent[global_client].access.get_desc(desc);
		else return desc;
	}
    get(obj){
		if(obj === this.client.eval.global){
			return this.client.eval.eval_global_proxy;
		}else if(obj === this.client.location.global){
			return this.client.location.proxy;
		}else if(this.unique_parent){
			return parent[global_client].access.get(obj);
		}else{
			return obj;
		}
    }
    set(target, value){
		if(target === this.client.location.global){
			return this.client.tomp.html.serve(new URL(value, this.client.location.proxy), this.client.location.proxy);
		}else if(this.unique_parent){
			return parent[global_client].access.set(target, value);
		}else{
			return value;
		}
	}
	pattern(obj){
		const result = {...obj};

		for(let key of undefinable)if(key in result){
			result[key] = this.get(result[key]);
		}

		return result;
	}
};