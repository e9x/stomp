import { Rewrite } from '../Rewrite.mjs';
import { global } from '../../Global.mjs';
import { hasOwnProperty, Reflect, wrap_function } from '../RewriteUtil.mjs';
import { undefinable, global_client } from '../../RewriteJS.mjs';

const undefinable_object = {};

for(let entry of undefinable){
	undefinable_object[entry] = true;
}

Reflect.setPrototypeOf(undefinable_object, null);

export const global_proxy = 'tompcgp$';
export const global_name = 'tompcgn$';

export class AccessRewrite extends Rewrite {
	// unique_top = parent !== top && global_client in parent;
	import(meta, url){
		const resolved = new URL(url, meta.url);

		return this.client.tomp.js.serve(resolved, this.client.location.proxy);
	}
	unique_parent = false;
	work(){
		this.client.location.global[global_proxy] = this.client.location.proxy;
		this.client.location.global[global_name] = 'location';
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

			for(let key of undefinable){
				if(key in result){
					result[key] = this.get_desc(result[key]);
				}
			}

			return result;
		});

		const entries = global.Object.entries = wrap_function(global.Object.entries, (target, that, [ obj ]) => {
			const result = Reflect.apply(target, that, [ obj ]);

			for(let pair of result){
				if(undefinable.includes(pair[0])){
					pair[1] = this.get(pair[1], pair[0]);
				}
			}

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
	set2(target, key, operate, righthand){
		// possibly a context
		
		if(this.client.type === 'page'){
			if(target === global){
				if(key === 'location'){
					target = this.client.location.proxy;
					key = 'href';
				}
			}else if(typeof target === 'object' && target !== null && hasOwnProperty(target, global_client)){
				return target[global_client].access.set2(target, key, operate);
			}
		}
		
		return operate(this.get(target, key), key, righthand);
	}
	/*assign(righthand, assignments, member_assignments){
		for(let [ righthand_key, target, name, set ] of assignments){
			this.set1(target, name, (target, prop) => target[prop] = righthand[righthand_key], value => set(value), righthand[righthand_key]);
		}
		
		for(let [ righthand_key, target, key ] of member_assignments){
			this.set2(target, key, (target, key, value) => target[key] = value, righthand[righthand_key]);
		}

		return righthand;
	}*/
	// identifier = value; identifier += value; identifier++;
	// location = set2(location, 'location', proxy => proxy += 'test')
    set1(target, name, operate, set, righthand){
		const proxy = this.get(target, name);

		const property = Symbol();
		const object = {
			[property]: proxy,
		};
		
		const result = operate(object, property, righthand);
		const value = object[property];

		if(typeof target === 'object' && target !== null && target[global_name] === 'location'){
			set(this.client.tomp.html.serve(new URL(value, this.client.base), this.client.base));
		}else{
			set(value);
		}

		return result;
	}
	new2(target, key, args){
		return Reflect.construct(this.get(target[key], key), args);
	}
	call2(target, key, args){
		return Reflect.apply(this.get(target[key], key), target, args);
	}
	get2(target, key){
		return this.get(target[key], key);
	}
	get(obj, key){
		/*if(!undefinable.includes(key)){
			return obj;
		}*/

		if(typeof key === 'string' && undefinable_object[key] === true && (typeof obj === 'object' || typeof obj === 'function') && obj !== null && hasOwnProperty(obj, global_proxy)){
			return obj[global_proxy];
		}
		
		return obj;
	  }
	pattern(target, destructor){
		const stack = [
			[ target, destructor ],
		];

		const result = {};

		Reflect.setPrototypeOf(result, null);

		while(stack.length){
			const [ target, destructor ] = stack.pop();

			for(let key in destructor){
				const value = this.get2(target, key); // target[key];
				const pattern = destructor[key];
				
				if(typeof pattern === 'string'){
					result[pattern] = value;
				}else if(Array.isArray(pattern)){
					stack.push([value,pattern]);
				}else if(typeof pattern === 'object' && pattern !== null){
					stack.push([value,pattern]);
				}
			}
		}

		return result;
	}
};