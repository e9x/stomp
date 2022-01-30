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
	set_binary_srcset = (attr, value, url, element) => {
		const parsed = parseSrcset(value);

		for(let src of parsed){
			const resolved = new URL(src.url, url).href;
			src.url = this.tomp.binary.serve(resolved, url);
		}

		element.attributes.set(attr, stringifySrcset(parsed));
	};
	test_name(name, match){
		if(name instanceof RegExp)return name === match;
		else if(typeof match == 'string')return name == match;
		else return name.match(match);
	}
	abstract = [
		{
			name: {
				tag: /./,
				class: /HTMLElement/, // /HTML.*?Element/
			},
			attributes: [
				{ name: 'style', type: 'css', context: 'declarationList' },
			],
		},
		// see https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/nonce
		{
			name: {
				tag: /[]/,
				class: 'HTMLElement',
			},
			attributes: [
				{ name: 'nonce', type: 'delete' },
			],
		},
		{
			name: {
				tag: /[]/,
				class: 'Node',
			},
			attributes: [
				{ name: 'baseURI', type: 'url', service: 'html' },
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
				{ name: 'srcset', type: 'delete', wrap: (value, url, element) => this.set_binary_srcset('srcset', value, url, element) },
				{ name: 'src', type: 'url', service: 'binary' },
			],
		},
		{
			name: {
				tag: 'img',
				class: 'HTMLImageElement',
			},
			attributes: [
				{ name: /[]/, class_name: 'currentSrc', type: 'url', service: 'binary', condition: (value, url, element) => value != '' },
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
				condition: (url, element) => js_types.includes(get_mime(element.attributes.get('type') || '').toLowerCase()),
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
				condition: (url, element) => css_types.includes(get_mime(element.attributes.get('type') || '').toLowerCase()),
			},
		},
		{
			name: {
				tag: 'a',
				class: 'HTMLAnchorElement',
			},
			attributes: [
				{ name: 'href', type: 'url', service: 'html' },
			],
		},
		{
			name: {
				tag: 'iframe',
				class: 'HTMLIFrameElement',
			},
			attributes: [
				{ name: 'src', type: 'url', service: 'html', condition: (value, url, element) => value != '' },
			],
		},
		{
			name: {
				tag: 'use',
				class: 'SVGUseElement',
			},
			attributes: [
				{ name: 'href', type: 'url', service: 'html' },
				{ name: 'xlink:href', class_name: undefined, type: 'url', service: 'html' },
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
					type: 'url',
					service: 'binary',
					wrap: (value, url, element) => {
						const resolved = new URL(value, url).href;
						
						switch(element.attributes.get('rel')){
							case'preload':
								switch(element.attributes.get('as')){
									case'style':
										element.attributes.set('href', this.tomp.css.serve(resolved, url));
										break;
									case'worker':
									case'script':
										element.attributes.set('href', this.tomp.js.serve(resolved, url));
										break;
									case'object':
									case'document':
										element.attributes.set('href', this.tomp.html.serve(resolved, url));
										break;
									default:
										element.attributes.set('href', this.tomp.binary.serve(resolved, url));
										break;
								}
								break;
							case'manifest':
								element.attributes.set('href', this.tomp.manifest.serve(resolved, url));
								break;
							case'alternate':
							case'amphtml':
							// case'profile':
								element.attributes.set('href', this.tomp.html.serve(resolved, url));
								break;
							case'stylesheet':
								element.attributes.set('href', this.tomp.css.serve(resolved, url));
								break;
							default:
								// this.tomp.log.warn('unknown rel', element.attributes.get('rel'));
								element.attributes.set('href', this.tomp.binary.serve(resolved, url));
								break;
						}
					},
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
					service: 'binary',
					wrap: (value, url, element) => {
						switch(element.attributes.get('http-equiv')){
							case'refresh':
								element.attributes.set('content', this.tomp.html.wrap_http_refresh(value, url));
								break;
						}
					},
				}
			],
		},
	];
	route_attributes(route, element, url){
		for(let name in route)if(element.attributes.has(name)){
			try{
				const result = route[name](element.attributes.get(name), url, element);
			}catch(err){
				this.tomp.log.error(err);
				element.attributes.delete(name);
			}
		}

		return true;
	}
	wrap(element, url, persist){
		return this.#wrap(element, url, persist, true);
	}
	unwrap(element, url, persist){
		return this.#wrap(element, url, persist, false);
	}
	abstract_type(value, url, element, data, wrap){
		if(typeof data.wrap == 'function' && wrap == true){
			data.wrap(value, url, element);
			return undefined;
		}else if(typeof data.unwrap == 'function' && wrap == false){
			data.unwrap(value, url, element);
			return undefined;
		}

		switch(data.type){
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
							return this.tomp[data.service].unwrap_serving(value, url);
						}
					default:
						console.warn('unknown service:', data.service);
						if(wrap){
							return this.tomp.url.wrap(new URL(value, url), data.service);
						}else{
							return this.tomp.url.unwrap_ez(value, url);
						}
				}
		}
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
				element.attributes.set('data-tomp-was', 'noscript')
			}else if(element.attributes.get('data-tomp-was') == 'noscript'){
				element.type = 'noscript';
				element.attributes.delete('data-tomp-was');
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
		
		for(let ab of this.abstract){
			if(this.test_name(element.type, ab.name.tag)){
				/*
				// condition outside attributes and content doesnt make sense
				if('condition' in ab){
					if(!ab.condition(url, element))continue;
				}*/

				if(ab.type == 'delete'){
					if(wrap){
						element.type = 'tomp-' + element.type;
					}else if(element.type.startsWith('tomp-')){
						element.type = element.type.slice('tomp-'.length);
					}
					continue;
				}

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
					if(data.type == 'delete' && !wrap && element.attributes.has(`data-tomp-${data.name}`)){
						element.attributes.set(data.name, element.attributes.get(`data-tomp-${data.name}`));
						element.attributes.delete(`data-tomp-${data.name}`);
					}
					
					if(!element.attributes.has(data.name)){
						continue;
					}

					let value = element.attributes.get(data.name);

					if('condition' in data){
						if(!data.condition(value, url, element)){
							continue;
						}
					}

					if(data.type == 'delete' && wrap){
						element.attributes.delete(data.name);
						element.attributes.set(`data-tomp-${data.name}`, value);
					}
					
					const changed = this.abstract_type(value, url, element, data, wrap);
					
					if(changed != undefined){
						element.attributes.set(data.name, changed);
					}
				}
			}
		}
		
		if(element.type == 'form'){
			const action_resolved = new URL(element.attributes.get('action') || '', url).href;
			
			if(element.attributes.get('method')?.toUpperCase() == 'POST'){
				element.attributes.set('method', this.tomp.html.serve(action_resolved, url));
			}else{
				element.attributes.set('method', this.tomp.form.serve(action_resolved, url));
			}
		}

		for(let [ name, value ] of element.attributes)if(name.startsWith('on')){
			element.attributes.set(name, this.tomp.js.wrap(value, url));
		}
	}
	// todo: form action
	get_attribute(element, url, name, value){
		for(let ab of this.abstract){
			if(!this.test_name(element.type, ab.name.tag)){
				continue;
			}

			if('condition' in ab){
				if(!ab.condition(url, element))continue;
			}

			if('attributes' in ab)for(let data of ab.attributes){
				if(!this.test_name(name, data.name)){
					continue;
				}

				if(data.type == 'delete' && element.attributes.has(`data-tomp-${data.name}`)){
					return element.attributes.get(`data-tomp-${data.name}`);
				}
				
				if(!element.attributes.has(data.name)){
					continue;
				}

				if('condition' in data){
					if(!data.condition(value, url, element)){
						continue;
					}
				}
				
				if(data.wrap){
					continue;
				}

				const changed = this.abstract_type(value, url, element, data, false);
				
				if(changed != undefined){
					return changed;
				}
			}
		}
		
		return value;
	}
	set_attribute(element, url, name, value){
		for(let ab of this.abstract){
			if(!this.test_name(element.type, ab.name.tag)){
				continue;
			}

			// if(element.type == 'script')debugger;

			if('condition' in ab){
				if(!ab.condition(url, element)){
					continue;
				}
			}

			if('attributes' in ab)for(let data of ab.attributes){
				if(!this.test_name(name, data.name)){
					continue;
				}

				if('condition' in data){
					if(!data.condition(value, url, element)){
						continue;
					}
				}
				
				if(data.type == 'delete'){
					element.attributes.delete(data.name);
					element.attributes.set(`data-tomp-${data.name}`, value);
				}
				
				if(data.unwrap){
					continue;
				}

				const changed = this.abstract_type(value, url, element, data, true);
				
				if(changed != undefined){
					element.attributes.set(data.name, changed);
				}
			}
		}
		
		return value;
	}
};