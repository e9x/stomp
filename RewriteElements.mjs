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
	wrap_innerHTML(value, url, element, wrap){
		for(let ab of this.abstract){
			if(!this.test_name(element.type, ab.name.tag))continue;
			
			if('content' in ab){
				let condition = true;

				if('condition' in ab.content){
					condition = ab.content.condition(value, url, element);
				}
				
				if(condition){
					const changed = this.abstract_type(value, url, element, ab.content, wrap);

					if(changed != undefined){
						return changed;
					}
				}
			}
		}

		if(wrap){
			return this.tomp.html.wrap(value, url, true);
		}else{
			return this.tomp.html.unwrap(value, url, true);
		}
	}
	wrap_textContent(value, url, element, wrap){
		for(let ab of this.abstract){
			if(!this.test_name(element.type, ab.name.tag))continue;
			
			if('content' in ab){
				let condition = true;

				if('condition' in ab.content){
					condition = ab.content.condition(value, url, element);
				}
				
				if(condition){
					const changed = this.abstract_type(value, url, element, ab.content, wrap);

					if(changed != undefined){
						return changed;
					}
				}
			}
		}

		return value;
	}
	abstract = [
		{
			name: {
				tag: /./,
				class: 'HTMLElement', // /HTML.*?Element/
			},
			attributes: [
				{ name: 'style', type: 'css', context: 'declarationList' },
				{ name: /^on.*?/, class_name: /[]/, type: 'js' },
				{
					name: /[]/,
					class_name: 'innerText',
					type: 'custom',
					wrap: (value, url, element) => this.wrap_textContent(value, url, element, true),
					unwrap: (value, url, element) => this.wrap_textContent(value, url, element, false),
				},
				{
					name: /[]/,
					class_name: 'outerText',
					type: 'custom',
					unwrap: (value, url, element) => this.wrap_textContent(value, url, element, false),
				},
				// see https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/nonce
				{ name: 'nonce', type: 'delete' },
			],
		},
		{
			name: {
				tag: /[]/,
				class: /^HTML.*?Element$/
			},
			attributes: [
				{
					name: /[]/,
					class_name: 'text',
					type: 'custom',
					wrap: (value, url, element) => this.wrap_textContent(value, url, element, true),
					unwrap: (value, url, element) => this.wrap_textContent(value, url, element, false),
				},
			],
		},
		{
			name: {
				tag: /[]/,
				class: 'Node',
			},
			attributes: [
				{ name: /[]/, class_name: 'baseURI', type: 'url', service: 'html' },
				{
					name: /[]/,
					class_name: 'textContent',
					type: 'custom',
					wrap: (value, url, element) => this.wrap_textContent(value, url, element, true),
					unwrap: (value, url, element) => this.wrap_textContent(value, url, element, false),
				},
			],
		},
		{
			name: {
				tag: /[]/,
				class: 'Element',
			},
			attributes: [
				{
					name: /[]/,
					class_name: 'innerHTML',
					type: 'custom',
					wrap: (value, url, element) => this.wrap_innerHTML(value, url, element, true),
					unwrap: (value, url, element) => this.wrap_innerHTML(value, url, element, false),
				},
				{ name: /[]/, class_name: 'outerHTML', type: 'html', fragment: true },
			],
		},
		{
			name: {
				tag: /^(img|script)$/,
				class: /^(HTMLScriptElement|HTMLImageElement)$/,
			},
			attributes: [
				{ name: 'crossorigin', class_name: 'crossOrigin', type: 'delete' },
			],
		},
		{
			name: {
				tag: /^(link|script)$/,
				class: /^(HTMLLinkElement|HTMLScriptElement)$/,
			},
			attributes: [
				{ name: 'integrity', type: 'delete' },
			],
		},
		{
			name: {
				tag: /^(img|source)$/,
				class: /^(HTMLImageElement|HTMLSourceElement)$/,
			},
			attributes: [
				// delete as in move to data-tomp-srcset, create attribute named srcset and set value to result of wrap
				{
					name: 'srcset',
					type: 'delete',
					wrap: (value, url, element) => {
						const parsed = parseSrcset(value);
						
						for(let src of parsed){
							const resolved = new URL(src.url, url).href;
							src.url = this.tomp.binary.serve(resolved, url);
						}

						return stringifySrcset(parsed);
					},
				},
				{ name: 'src', type: 'url', service: 'binary' },
			],
		},
		{
			name: {
				tag: 'img',
				class: 'HTMLImageElement',
			},
			attributes: [
				{ name: /[]/, class_name: 'currentSrc', type: 'url', service: 'binary' },
				{ name: 'lowsrc', type: 'url', service: 'binary' },
			],
		},
		{
			name: {
				tag: /^(video|audio)$/,
				class: 'HTMLMediaElement',
			},
			attributes: [
				{ name: 'src', type: 'url', service: 'binary' },
			],
		},
		{
			name: {
				tag: 'input',
				class: 'HTMLInputElement',
			},
			attributes: [
				{ name: 'src', type: 'url', service: 'binary' },
			],
		},
		{
			name: {
				tag: 'video',
				class: 'HTMLVideoElement',
			},
			attributes: [
				{ name: 'poster', type: 'url', service: 'binary' },
			],
		},
		{
			name: {
				tag: 'script',
				class: 'HTMLScriptElement',
			},
			attributes: [
				{ name: 'src', type: 'url', service: 'js' },
			],
			// condition could be in attribute or content
			// for scripts, if the type isnt a valid js mime then its ignored
			content: {
				type: 'js',
				condition: (value, url, element) => js_types.includes(get_mime(element.attributes.get('type') || '').toLowerCase()),
			},
		},
		{
			name: {
				tag: 'style',
				class: 'HTMLStyleElement',
			},
			// <style> is strictly content-only
			content: {
				type: 'css',
				condition: (value, url, element) => css_types.includes(get_mime(element.attributes.get('type') || '').toLowerCase()),
			},
		},
		{
			name: {
				tag: 'a',
				class: 'HTMLAnchorElement',
			},
			attributes: [
				{ name: 'ping', type: 'url', service: 'html' },
				{ name: 'href', type: 'url', service: 'html' },
			],
		},
		{
			name: {
				tag: 'form',
				class: 'HTMLFormElement',
			},
			attributes: [
				// name must be a string for allow_notexist to work
				{ name: 'action', type: 'url', service: 'form', allow_notexist: true, allow_empty: true },
			],
		},
		{
			name: {
				tag: 'iframe',
				class: 'HTMLIFrameElement',
			},
			attributes: [
				{ name: 'src', type: 'url', service: 'html' },
				{ name: 'srcdoc', type: 'html' },
			],
		},
		{
			name: {
				tag: 'frame',
				class: 'HTMLFrameElement',
			},
			attributes: [
				{ name: 'src', type: 'url', service: 'html' },
			],
		},
		{
			name: {
				tag: 'use',
				class: 'SVGUseElement',
			},
			attributes: [
				{ name: 'href', type: 'url', service: 'html' },
				{ name: 'xlink:href', class_name: /[]/, type: 'url', service: 'html' },
			],
		},
		{
			name: {
				tag: 'link',
				class: 'HTMLLinkElement',
			},
			attributes: [
				{
					name: 'href',
					type: 'delete',
					wrap: this.link_wrap('href'),
				},
				{
					name: 'rel',
					type: 'delete',
					wrap: this.link_wrap('rel'),
				},
				{
					name: 'as',
					type: 'delete',
					wrap: this.link_wrap('as'),
				},
			],
		},
		{
			name: {
				tag: 'meta',
				class: 'HTMLMetaElement',
			},
			attributes: [
				{
					name: 'content',
					type: 'delete',
					wrap: (value, url, element) => {
						switch(element.attributes.get('http-equiv')){
							case'encoding':
							case'Content-Type':
								return value;
							case'refresh':
								return this.tomp.html.wrap_http_refresh(value, url);
						}
					},
				}
			],
		},
	];
	link_wrap(name){
		return (value, url, element) => {
			let href;
			
			if(name === 'href'){
				href = value;
			}else if(element.attributes.has('data-tomp-href')){
				href = element.attributes.get('data-tomp-href');
			}else if(element.attributes.has('href')){
				href = element.attributes.get('href');
			}else{
				return value;
			}

			let as;
			
			if(name === 'as'){
				as = value;
			}else if(element.attributes.has('data-tomp-as')){
				as = element.attributes.get('data-tomp-as');
			}else if(element.attributes.has('as')){
				as = element.attributes.get('as');
			}else{
				// return value;
				as = undefined;
			}

			let rel;
			
			if(name === 'rel'){
				rel = value;
			}else if(element.attributes.has('data-tomp-rel')){
				rel = element.attributes.get('data-tomp-rel');
			}else if(element.attributes.has('rel')){
				rel = element.attributes.get('rel');
			}else{
				return value;
			}

			const resolved = new URL(href, url).href;
			const wrapped = this.wrap_link(url, resolved, rel, as);

			if(wrapped === undefined){
				element.attributes.delete('href');
			}else{
				element.attributes.set('href', wrapped);
			}

			element.attributes.set('data-tomp-href', href);
			
			return value;
		};
	}
	wrap_link(url, resolved, rel, as){
		switch(rel){
			case'prefetch':
			case'preload':
				switch(as){
					case'style':
						return this.tomp.css.serve(resolved, url);
					case'worker':
					case'script':
						return this.tomp.js.serve(resolved, url);
					case'object':
					case'document':
						return this.tomp.html.serve(resolved, url);
					default:
						return this.tomp.binary.serve(resolved, url);
				}
				break;
			case'manifest':
				return this.tomp.manifest.serve(resolved, url);
			case'alternate':
			case'amphtml':
			// case'profile':
				return this.tomp.html.serve(resolved, url);
			case'stylesheet':
				return this.tomp.css.serve(resolved, url);
			default:
				// this.tomp.log.warn('unknown rel', element.attributes.get('rel'));
				return this.tomp.binary.serve(resolved, url);
		}
	}
	wrap(element, url, persist){
		return this.#wrap(element, url, persist, true);
	}
	unwrap(element, url, persist){
		return this.#wrap(element, url, persist, false);
	}
	abstract_type(value, url, element, data, wrap){
		if(typeof data.wrap == 'function' && wrap == true){
			return data.wrap(value, url, element);
		}else if(typeof data.unwrap == 'function' && wrap == false){
			return data.unwrap(value, url, element);
		}

		switch(data.type){
			case'delete':
				return null;
				break;
			case'css':
				if(wrap){
					return this.tomp.css.wrap(value, url, data.context);
				}else{
					return this.tomp.css.unwrap(value, url, data.context);
				}
			case'js':
				if(wrap){
					return this.tomp.js.wrap(value, url);
				}else{
					return this.tomp.js.unwrap(value, url);
				}
			case'html':
				if(wrap){
					return this.tomp.html.wrap(value, url, data.fragment);
				}else{
					return this.tomp.html.unwrap(value, url, data.fragment);
				}
			case'url':
				switch(data.service){
					case'js':
					case'css':
					case'manifest':
					case'form':
					case'binary':
					case'html':
						if(wrap){
							return this.tomp[data.service].serve(new URL(value, url), url);
						}else{
							return this.tomp[data.service].unwrap_serving(value, url).toString();
						}
					default:
						this.tomp.log.warn('unknown service:', data.service);
						if(wrap){
							return this.tomp.url.wrap(new URL(value, url), data.service);
						}else{
							return this.tomp.url.unwrap_ez(value, url).toString();
						}
				}
		}
		
		return value;
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
		
		const unwrapped_keys = [];
		
		if(!wrap){
			for(let name of [...element.attributes.keys()]){
				if(name.startsWith('data-tomp-')){
					const og_name = name.slice('data-tomp-'.length);
		
					element.attributes.set(og_name, element.attributes.get(name));
					element.attributes.delete(name);
		
					unwrapped_keys.push(og_name);

					continue;
				}
			}
		}
		
		for(let ab of this.abstract){
			if(!this.test_name(element.type, ab.name.tag))continue;
			
			if('content' in ab){
				const content = element.text;

				if(content?.match(/\S/)){
					let condition = true;

					if('condition' in ab.content){
						condition = ab.content.condition(content, url, element);
					}
					
					if(condition){
						const changed = this.abstract_type(content, url, element, ab.content, wrap);

						if(changed != undefined){
							element.text = changed;
						}
					}
				}
			}

			if('attributes' in ab)for(let data of ab.attributes){
				if(data.allow_notexist && !element.attributes.has(data.name)){
					element.attributes.set(data.name, '');
				}
				
				for(let name of [...element.attributes.keys()]){
					if(unwrapped_keys.includes(name)){
						continue;
					}

					if(!this.test_name(name, data.name)){
						continue;
					}
					
					let value = element.attributes.get(name);

					if(!value && !data.allow_empty){
						continue;
					}

					if('condition' in data){
						if(!data.condition(value, url, element)){
							continue;
						}
					}

					if(data.type == 'delete' && wrap){
						element.attributes.delete(name);
						element.attributes.set(`data-tomp-${name}`, value);
					}
					
					const changed = this.abstract_type(value, url, element, data, wrap);
					
					if(changed === null){
						element.attributes.delete(`${name}`)
					}else if(changed !== undefined){
						if(wrap){
							element.attributes.set(`data-tomp-${name}`, value);
						}
						
						element.attributes.set(name, changed);
					}
				}
			}
		}
	}
	// todo: form action
	get_attribute(element, url, name, use_class, value, class_name){
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
				
				// data.type === 'delete' && 
				// data-tomp- is the get/setAttribute value
				if((data.type === 'delete' || !use_class) && element.attributes.has(`data-tomp-${name}`)){
					return element.attributes.get(`data-tomp-${name}`);
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