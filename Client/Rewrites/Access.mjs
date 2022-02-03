import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { Reflect, wrap_function } from '../RewriteUtil.mjs';
import { undefinable, global_client } from '../../RewriteJS.mjs';

export const global_proxy = 'tompcgp$';

export class AccessRewrite extends Rewrite {
	// unique_top = parent !== top && global_client in parent;
	import(meta, url){
		const resolved = new URL(url, meta.url);

		return this.client.tomp.js.serve(resolved, this.client.location.proxy);
	}
	unique_parent = false;
	work(){
		this.client.location.global[global_proxy] = this.client.location.proxy;
		this.client.eval.global[global_proxy] = this.client.eval.eval_global_proxy;
		
		if(this.client.type === 'page'){
			this.unique_parent = parent !== global  && global_client in parent;
		}
		
		global.Reflect.get = wrap_function(global.Reflect.get, (target, that, [ obj, prop, rece ]) => {
			return this.get2(target, prop);
		});
		
		global.Reflect.set = wrap_function(global.Reflect.set, (target, that, [ obj, prop, value ]) => {
			return this.set2(obj, prop, (obj, prop) => obj[prop] = value);
		});
		
		const get_desc = (target, that, [ obj, prop ]) => {
			let result = Reflect.apply(target, that, [ obj, prop ]);
			result = this.get_desc(result);
			return result;
		};
		
		const reflect_desc = global.Reflect.getOwnPropertyDescriptor = wrap_function(global.Reflect.getOwnPropertyDescriptor, get_desc);
		
		global.Object.getOwnPropertyDescriptor = wrap_function(global.Object.getOwnPropertyDescriptor, get_desc);

		global.Object.getOwnPropertyDescriptors = wrap_function(global.Object.getOwnPropertyDescriptors, (target, that, [ obj ]) => {
			const result = Reflect.apply(target, that, [ obj ]);

			for(let key of undefinable)if(key in result){
				result[key] = this.get_desc(result[key]);
			}
			
			return result;
		});

		const entries = global.Object.entries = wrap_function(global.Object.entries, (target, that, [ obj ]) => {
			const result = Reflect.apply(target, that, [ obj ]);

			for(let pair of result)if(undefinable.includes(pair[0]))pair[1] = this.get(pair[1], pair[0]);
			
			return result;
		});
		
		global.Object.values = wrap_function(global.Object.values, (target, that, [ obj ]) => {
			const result = Reflect.apply(entries, that, [ obj ]);

			for(let i = 0; i < result.length; i++){
				result[i] = result[i][1];
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
	set2(target, prop, operate){
		// possibly a context
		
		if(this.client.type === 'page'){
			if(target === global){
				if(prop == 'location'){
					target = this.client.location.proxy;
					prop = 'href';
				}
			}else if(typeof target === 'object' && target !== null && global_client in target){
				return target[global_client].access.set2(target, prop, operate);
			}
		}
		
		return operate(this.get(target, prop), prop);
	}
	// identifier = value; identifier += value; identifier++;
	// location = set2(location, 'location', proxy => proxy += 'test')
    set1(value, name, operate){
		const proxy = this.get(value, name);

		return operate(proxy);
	}
	get2(target, prop){
		return this.get(target[prop], prop);
	}
	get(obj, prop, check_parent = true /* only specified by and in this function */){
		if(undefinable.includes(prop) && (typeof obj === 'function' || typeof obj =='object') && obj !== null){
			if(global_proxy in obj){
				return obj[global_proxy];
			}
		}
		
		return obj;
    }
	pattern(obj){
		const result = {...obj};

		for(let key of undefinable)if(key in result){
			result[key] = this.get(result[key], key);
		}

		return result;
	}
};