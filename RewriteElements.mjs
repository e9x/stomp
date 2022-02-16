import { parseSrcset, stringifySrcset } from 'srcset';

const attribute_original = 'data-tomp-value-';

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
		
		for(let [name,value] of [...element.attributes]){
			let context;
			
			if(wrap){
				context = this.set_attribute(name, value, element, url);
			}else{
				context = this.get_attribute(name, value, element, url);
			}
			
			if(context.deleted){
				element.attributes.delete(name);
			}else{
				element.attributes.set(name, context.value);
			}
		}
	}
	rewrites = [
		{
			name: {
				tag: 'a',
				class: 'a',
			},
			attributes: [
				{
					name: {
						tag: 'href',
						class: 'href',
					},
					wrap: (name, value, element, url, context) => {
						context.value = this.tomp.html.serve(new URL(value, url), url).toString();
						context.modified = true;
					},
					unwrap: (name, value, element, url, context) => {
						context.value = this.tomp.html.unwrap_serving(value, url).toString();
						context.modified = true;
					},
				},
			],
		}
	];
	get_attribute(name, value, element, url){
		if(name.startsWith(attribute_original)){
			return {
				deleted: true,
			};
		}

		if(element.attributes.has(attribute_original + name)){
			return {
				value: element.attributes.get(attribute_original + name),
			};
		}

		for(let rewrite of this.rewrites){
			if(rewrite.name.tag == element.type){
				for(let [name,value] of [...element.attributes]){
					for(let attr of rewrite.attributes){
						const context = {};
						
						attr.unwrap(name, value, element, url, context);
						
						return context;
					}
				}
			}
		}

		return { value };
	}
	set_attribute(name, value, element, url){
		if(name.startsWith(attribute_original)){
			return {
				deleted: true,
			};
		}

		if(element.attributes.has(attribute_original + name)){
			return {
				value: element.attributes.get(attribute_original + name),
			};
		}

		for(let rewrite of this.rewrites){
			if(rewrite.name.tag == element.type){
				for(let [name,value] of [...element.attributes]){
					for(let attr of rewrite.attributes){
						const context = {};
						
						attr.wrap(name, value, element, url, context);
						
						if(context.modified){
							element.attributes.set(attribute_original + name, value);
						}

						return context;
					}
				}
			}
		}

		return { value };
	}
};