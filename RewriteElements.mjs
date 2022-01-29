import { parseSrcset, stringifySrcset } from 'srcset';

export class TOMPElement {
	attributes = new Map();
	detach(){
		throw new Error('detach() not implemented');
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
	abstract = [
		{
			name: {
				tag: 'img',
				class: 'HTMLImageElement',
			},
			attributes: {
				'src': { type: 'url', service: 'binary' },
				'lowsrc': { type: 'url', service: 'binary' },
				// delete as in move to data-tomp-srcset, create attribute named srcset and set value to result of wrap
				'srcset': { type: 'custom-wrap-delete-unwrap', wrap: (value, url, element) => this.set_binary_srcset('srcset', value, url, element) },
				'crossorigin': { type: 'delete' },
			},
		},
		{
			name: {
				tag: 'script',
				class: 'HTMLScriptElement',
			},
			condition: (url, element) => js_types.includes(get_mime(element.attributes.get('type') || '').toLowerCase()),
			attributes: {
				'src': { type: 'url', service: 'js' },
				'crossorigin': { type: 'delete' },
				'nonce': { type: 'delete' },
			},
			// condition could be in attribute or content
			// for scripts, if the type isnt a valid js mime then its ignored
			content: { type: 'js' },
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
	// persist is an object containing data usually stored once per page rewrite
	#wrap(element, url, persist, wrap){
		if(!wrap && element.attributes.has('data-is-tomp')){
			element.attributes.set('data-ok','x');
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
		
		if(element.type in this.content && element.text?.match(/\S/)){
			const result = this.content[element.type](element.text, url, element);
			element.text = result;
		}
		
		if(element.attributes.has('style')){
			this.all_style(element.attributes.get('style'), url, element);
		}

		for(let ab of this.abstract){
			if(ab.name.tag == element.type){
				
				if('condition' in ab){
					if(!ab.condition(url, element))continue;
				}


				if('content' in ab){
					const content = element.textContent;

					if('condition' in ab.content){
						if(!ab.content.condition(content, url, element))continue;
					}

					switch(ab.content.type){
						case'js':
							element.textContent = this.tomp.js.wrap(content, url);
							break;
						case'css':
							element.textContent = this.tomp.css.wrap(content, url);
							break;
					}	
				}

				if('attributes' in ab)for(let attribute in ab.attributes){
					const data = ab.attributes[attribute];
					
					const is_delete_wrap = ['delete','custom-wrap-delete-unwrap'].includes(data.type);
					const custom_wrap = ['custom-wrap-delete-unwrap'].includes(data.type);
					const custom_unwrap = ['custom-wrap-custom-unwrap'].includes(data.type);
					
					if(is_delete_wrap && !wrap && element.attributes.has(`data-tomp-${attribute}`)){
						element.attributes.set(attribute, element.attributes.get(`data-tomp-${attribute}`));
						element.attributes.delete(`data-tomp-${attribute}`);
					}

					if(!element.attributes.has(attribute))continue;
					
					const value = element.attributes.get(attribute);

					if('condition' in data){
						if(!data.condition(value, url, element))continue;
					}

					if(is_delete_wrap && wrap){
						element.attributes.delete(attribute);
						element.attributes.set(`data-tomp-${attribute}`, value);
					}
					
					if(custom_wrap && wrap == true){
						data.wrap(value, url, element);
					}else if(custom_unwrap && wrap == false){
						data.unwrap(value, url, element);
					}else{
						switch(data.type){
							case'url':

								if(wrap){
									element.attributes.set(attribute, this.tomp.url.wrap(new URL(value, url), data.service));
								}else{
									element.attributes.set(attribute, this.tomp.url.unwrap_ez(value, url));
								}
								
								break;
						}
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
	content = {
		script: (value, url, element) => {
			const type = get_mime(element.attributes.get('type') || '').toLowerCase();
			
			if(js_types.includes(type)){
				return this.tomp.js.wrap(value, url);
			}else{
				return value;
			}
		},
		style: (value, url, element) => {
			const type = get_mime(element.attributes.get('type') || '').toLowerCase();
			
			if(css_types.includes(type))return this.tomp.css.wrap(value, url);
			else return value;
		},
	};
	binary_src = attr => (value, url, element) => {
		const resolved = new URL(value, url).href;
		element.attributes.set(attr, this.tomp.binary.serve(resolved, url));
	};
	html_src = attr => (value, url, element) => {
		const nurl = new URL(value, url);
		if(nurl.protocol == 'javascript:')return 'javascript:' + this.tomp.js.wrap(nurl.pathname, url);
		const resolved = nurl.href;
		element.attributes.set(attr, this.tomp.html.serve(resolved, url));
	};
	binary_srcset = attr => (value, url, element) => {
		const parsed = parseSrcset(value);

		for(let src of parsed){
			const resolved = new URL(src.url, url).href;
			src.url = this.tomp.binary.serve(resolved, url);
		}

		element.attributes.set(attr, stringifySrcset(parsed));
	};
	delete_attr = attr => (value, url, element) => {
		element.attributes.set(`data-tomp-${attr}`, value);
		element.attributes.delete('integrity');
	};
	all_style(value, url, element){
		return this.tomp.css.wrap(value, url, true);
	}
	attributes = {
		use: {
			'xlink:href': this.html_src('xlink:href'),
			'href': this.html_src('href'),
		},
		script: {
			src: (value, url, element) => {
				const type = get_mime(element.attributes.get('type') || '').toLowerCase();
				const resolved = new URL(value, url).href;
				
				if(js_types.includes(type)){
					element.attributes.set('src', this.tomp.js.serve(resolved, url));
				}else{
					element.attributes.set('src', this.tomp.binary.serve(resolved, url));
				}
			},
			nonce: this.delete_attr('nonce'),
			integrity: this.delete_attr('integrity'),
		},
		iframe: {
			src: this.html_src('src'),
		},
		img: {
			src: this.binary_src('src'),
			lowsrc: this.binary_src('src'),
			srcset: this.binary_srcset('srcset'),
		},
		audio: {
			src: this.binary_src('src'),
		},
		source: {
			src: this.binary_src('src'),
			srcset: this.binary_srcset('srcset'),
		},
		video: {
			src: this.binary_src('src'),
			poster: this.binary_src('poster'),
		},
		a: {
			href: this.html_src('href'),
		},
		link: {
			href: (value, url, element) => {
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
						element.attributes.set('href', this.tomp.binary.serve(resolved, url));
						break;
				}
			},
			integrity: this.delete_attr('integrity'),
		},
		meta: {
			content: (value, url, element) => {
				const resolved = new URL(value, url).href;
				
				element.attributes.set('data-tomp-content', value);

				switch(element.attributes.get('http-equiv')){
					case'content-security-policy':
						element.detach();
						break;
					case'refresh':
						element.attributes.set('content', this.tomp.html.wrap_http_refresh(value, url));
						break;
				}
				
				switch(element.attributes.get('itemprop')){
					case'image':
						element.attributes.set('content', this.tomp.binary.serve(resolved, url));
						break;
				}

				switch(element.attributes.get('property')){
					case'og:url':
					case'og:video:url':
					case'og:video:secure_url':
						element.attributes.set('content', this.tomp.html.serve(resolved, url));
						break;
					case'og:image':
						element.attributes.set('content', this.tomp.binary.serve(resolved, url));
						break;
				}

				switch(element.attributes.get('name')){
					case'referrer':
						element.detach();
						break;
					case'twitter:app:url:googleplay':
					case'twitter:url':
					case'parsely-link':
					case'parsely-image-url':
						element.attributes.set('content', this.tomp.html.serve(resolved, url));
						break;
					case'twitter:image':
					case'sailthru.image.thumb':
					case'msapplication-TileImage':
						element.attributes.set('content', this.tomp.binary.serve(resolved, url));
						break;
					case'style-tools':
						element.attributes.set('content', this.tomp.css.serve(resolved, url));
						break;
				}
			},
		},
	};
};