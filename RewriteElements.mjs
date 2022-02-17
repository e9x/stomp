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

export class TargetName {
	constructor(tag, class_tag = tag){
		this.tag = tag;
		this.class = class_tag;
	}
	#test(test, match){
		if(test === true){
			return true;
		}else if(test === false){
			return false;
		}else if(typeof test === 'string'){
			return test === match;
		}else if(test instanceof RegExp){
			if(typeof match === 'string'){
				return test.test(match);
			}else if(match instanceof RegExp){
				return test === match;
			}
		}

		return false;
	}
	test_tag(match){
		return this.#test(this.tag, match);
	}
	test_class(match){
		return this.#test(this.class, match);
	}
};

export class RewriteElements {
	// no unwrap() === always use the original value
	abstractions = [
		{
			name: new TargetName('iframe', 'HTMLIFrameElement'),
			attributes: [
				{
					name: new TargetName('src'),
					wrap: (name, value, element, url, context) => {
						context.value = this.tomp.html.serve(new URL(value, url), url).toString();
						context.modified = true;
					},
					unwrap: (name, value, element, url, context) => {
						context.value = this.tomp.html.unwrap_serving(value, url).toString();
						context.modified = true;
					},
				},
				{
					name: new TargetName('srcdoc'),
					wrap: (name, value, element, url, context) => {
						context.value = this.tomp.html.wrap(value, url);
						context.modified = true;
					},
					unwrap: (name, value, element, url, context) => {
						context.value = this.tomp.html.unwrap(value, url);
						context.modified = true;
					},
				},
			],
		},
		{
			name: new TargetName(/^(link|script)$/, /^(HTMLLinkElement|HTMLScriptElement)$/),
			attributes: [
				{
					name: new TargetName('name'),
					wrap: (name, value, element, url, context) => {
						context.deleted = true;
					},
				}
			],
		},
		{
			name: new TargetName('frame', 'HTMLFrameElement'),
			attributes: [
				{
					name: new TargetName('src'),
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
		},
		{
			name: new TargetName('a', 'HTMLAnchorElement'),
			attributes: [
				{
					name: new TargetName('href'),
					wrap: (name, value, element, url, context) => {
						context.value = this.tomp.html.serve(new URL(value, url), url).toString();
						context.modified = true;
					},
					unwrap: (name, value, element, url, context) => {
						context.value = this.tomp.html.unwrap_serving(value, url).toString();
						context.modified = true;
					},
				},
				{
					name: new TargetName('ping'),
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
		},
		{
			name: new TargetName('use', 'SVGUseElement'),
			attributes: [
				{
					name: new TargetName('href'),
					wrap: (name, value, element, url, context) => {
						context.value = this.tomp.html.serve(new URL(value, url), url).toString();
						context.modified = true;
					},
					unwrap: (name, value, element, url, context) => {
						context.value = this.tomp.html.unwrap_serving(value, url).toString();
						context.modified = true;
					},
				},
				{
					name: new TargetName('xlink:href', false),
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
		},
		{
			name: new TargetName('meta', 'HTMLMetaElement'),
			attributes: [
				{
					name: new TargetName('content'),
					wrap: (name, value, element, url, context) => {
						if(element.attributes.has('charset')){
							return;
						}

						switch(element.attributes.get('http-equiv')?.toLowerCase()){
							case'encoding':
							case'content-type':
								break;
							case'refresh':
								context.value = this.tomp.html.wrap_http_refresh(value, url);
								context.modified = true;
								break;
							default:	
								context.deleted = true;
								break;
						}
					},
				}
			],
		},
	];
	constructor(tomp){
		this.tomp = tomp;
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
		
		const original_names = [];

		if(!wrap)for(let [name,value] of [...element.attributes]){
			if(!name.startsWith(attribute_original)){
				continue;
			}
			
			const original_name = name.slice(attribute_original.length);
			element.attributes.delete(name);
			element.attributes.set(original_name, value);
			original_names.push(original_name);
		}

		for(let [name,value] of [...element.attributes]){
			if(wrap){
				this.set_attribute(name, value, element, url);
			}else{
				if(original_names.includes(name)){
					continue;
				}
				
				const context = this.get_attribute(name, value, element, url);
				
				if(context.modified){
					element.attributes.set(name, context.value);
				}
			}
		}
	}
	unwrap_original(name, value, element, url, context){
		if(element.attributes.has(attribute_original + name)){
			context.value = element.attributes.get(attribute_original);
			context.modified = true;				
		}else{
			console.log('no original', name, element.attributes);
		}
	}
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

		for(let ab of this.abstractions){
			if(!ab.name.test_tag(element.type)){
				continue;
			}

			for(let [aname,value] of [...element.attributes]){
				for(let attr of ab.attributes){
					if(!attr.name.test_tag(name)){
						continue;
					}
					
					const context = {};

					/*
					if(!attr.unwrap){
						this.unwrap_original(name, value, element, url, context);
					}else{
						attr.unwrap(name, value, element, url, context);
					}*/

					attr.unwrap(name, value, element, url, context);

					return context;
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

		for(let rewrite of this.abstractions){
			if(!rewrite.name.test_tag(element.type)){
				continue;
			}

			for(let [name,value] of [...element.attributes]){
				for(let attr of rewrite.attributes){
					if(!attr.name.test_tag(name)){
						continue;
					}

					const context = {};
					
					attr.wrap(name, value, element, url, context);
					
					if(context.modified || context.deleted){
						element.attributes.set(attribute_original + name, value);
					}
					
					if(context.deleted){
						element.attributes.delete(name);
					}else{
						element.attributes.set(name, context.value);
					}

					return context;
				}
			}
		}

		return { value };
	}
};