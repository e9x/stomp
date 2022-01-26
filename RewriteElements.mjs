import { parseSrcset, stringifySrcset } from 'srcset';

export class TOMPElement {
	attributes = new Map();
	detached = true;
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
	// persist is an object containing data usually stored once per page rewrite
	wrap(element, url, persist){
		if(element.type == 'noscript' && this.tomp.noscript){
			element.tagName = 'span';
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

		if(element.type in this.attributes){
			if(!this.route_attributes(this.attributes[element.type], element, url))return;
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
			nonce: (value, url, element) => {
				element.attributes.delete('nonce');
			},
			integrity: (value, url, element) => {
				element.attributes.delete('integrity');
			},
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
			integrity: (value, url, element) => {
				element.attributes.delete('integrity');
			},
		},
		meta: {
			content: (value, url, element) => {
				const resolved = new URL(value, url).href;
				
				switch(element.attributes.get('http-equiv')){
					case'content-security-policy':
						element.detach();
						break;
					case'refresh':
					element.attributes.set('content', this.wrap_http_refresh(value, url));
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