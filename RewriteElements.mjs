import { parseSrcset, stringifySrcset } from 'srcset';

export class TOMPElement {
	attributes = new Map();
	detach(){
		throw new Error('detach() not implemented');
	}
	sync(){
		throw new Error('sync() not implemented');
	}
	get type(){
		throw new Error('get type() not implemented');
	}
	set type(value){
		throw new Error('set type(value) not implemented');
	}
	get text(){
		throw new Error('get text() not implemented');
	}
	set text(value){
		throw new Error('set text(value) not implemented');
	}
	get parent(){
		throw new Error('get parent() not implemented');
	}
};

export function get_mime(content_type){
	return content_type.split(';')[0];
}

export const js_module_types = ['module'];
export const js_types = ['text/javascript','application/javascript','',...js_module_types];
export const css_types = ['text/css',''];
export const html_types = ['image/svg+xml', 'text/html',''];

export class RewriteElements {
	constructor(tomp){
		this.tomp = tomp;
	}
	test_name(name, match){
		if(name instanceof RegExp){
			return name === match;
		}else if(typeof match == 'string'){
			return name == match;
		}else if(typeof name == 'string'){
			return name.match(match);
		}else{
			return false;
		}
	}
	wrap(element, url, persist){
		return this.#wrap(element, url, persist, true);
	}
	unwrap(element, url, persist){
		return this.#wrap(element, url, persist, false);
	}
	// persist is an object containing data usually stored once per page rewrite
	#wrap(element, url, persist, wrap){
		if(!wrap && element.attributes.has('data-is-tomp')){
			element.detach();
			return;
		}

		if(element.type == 'noscript' && this.tomp.noscript){
			if(wrap){
				element.type = 'span';
				element.attributes.set('data-element-tomp-was', 'noscript')
			}else if(element.attributes.get('data-element-tomp-was') == 'noscript'){
				element.type = 'noscript';
				element.attributes.delete('data-element-tomp-was');
			}

			return;
		}

		if(element.type == 'base' && element.parent?.type == 'head' && !persist.one_base){
			persist.one_base = true;
			if(element.attributes.has('href'))try{
				url = new URL(element.attributes.get('href'), url);
			}catch(err){
				this.tomp.log.error(err);
			}
			
			if(element.attributes.has('target')){
				persist.one_target = element.attributes.get('target');
			}

			element.type = 'tomp-base';
			return;
		}
		
		if(element.type == 'a' && !element.attributes.has('target') && persist.one_target != undefined){
			element.attributes.set('target', persist.one_target);
		}
		
		
	}
	// todo: form action
	get_attribute(element, url, name, use_class, value, class_name){
		// data.type === 'delete' && 
		// data-tomp- is the get/setAttribute value
		
		if(/*!use_class && */element.attributes.has(`data-tomp-${name}`)){
			return element.attributes.get(`data-tomp-${name}`);
		}

		//  further operations require a value
		if(value == undefined)return undefined;

		for(let ab of this.abstract){
			if(use_class){
				if(!this.test_name(class_name, ab.name.class)){
					continue;
				}
			}else{
				if(!this.test_name(element.type, ab.name.tag)){
					continue;
				}
			}

			if('condition' in ab){
				if(!ab.condition(url, element)){
					continue;
				}
			}

			if('attributes' in ab)for(let data of ab.attributes){
				if(!this.test_name(name, use_class && data.class_name ? data.class_name : data.name)){
					continue;
				}
				
				if(!value && !data.allow_empty){
					return '';
				}
				
				if(!use_class && !element.attributes.has(name) && !data.allow_notexist){
					continue;
				}
				
				if('condition' in data){
					if(!data.condition(value, url, element)){
						continue;
					}
				}
				
				const changed = this.abstract_type(value, url, element, data, false);
				return changed;
			}
		}
		
		return value;
	}
	set_attribute(element, url, name, use_class, value, class_name){
		if(value === ''){
			return '';
		}

		for(let ab of this.abstract){
			if(use_class){
				if(!this.test_name(class_name, ab.name.class)){
					continue;
				}
			}else{
				if(!this.test_name(element.type, ab.name.tag)){
					continue;
				}
			}

			if('condition' in ab){
				if(!ab.condition(url, element)){
					continue;
				}
			}

			if('attributes' in ab)for(let data of ab.attributes){
				if(!this.test_name(name, use_class && data.class_name ? data.class_name : data.name)){
					continue;
				}
				
				if('condition' in data){
					if(!data.condition(value, url, element)){
						continue;
					}
				}
				
				if(data.type == 'delete'){
					element.attributes.delete(name);
					element.attributes.set(`data-tomp-${name}`, value);
				}
				
				if(!value && !data.allow_empty){
					return '';
				}

				const changed = this.abstract_type(value, url, element, data, true);
				
				/*
				if:
					not a class: node.getAttribute
					didnt match a class: node.src
				*/

				if(!use_class || !data.class_name){
					element.attributes.set(`data-tomp-${name}`, value);
				}

				return changed;
			}
		}
		
		return value;
	}
};