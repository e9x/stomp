import { ParseDataURI } from './DataURI.mjs'
import { serialize, parse, parseFragment } from 'parse5';
import { Parse5Iterator } from './IterateParse5.mjs';
import { global_client } from './RewriteJS.mjs';
import { parseSrcset, stringifySrcset } from 'srcset';

const essential_nodes = ['#documentType','#document','#text','html','head','body'];

export const js_types = ['text/javascript','application/javascript','module',''];
export const css_types = ['text/css',''];
export const html_types = ['image/svg+xml', 'text/html',''];

export function get_mime(content_type){
	return content_type.split(';')[0];
}

function P5_attribute_object(attrs){
	const result = Object.setPrototypeOf({}, null);
	
	for(let { name, value } of attrs){
		if(!(name in result))result[name] = value;
	}

	return result;
};

function P5_object_attrs(object){
	const result = [];
	
	for(let [ name, value ] of Object.entries(object)){
		if(typeof value != 'string')throw new TypeError(`Attribute ${name} was not a string.`);
		result.push({ name, value });
	}

	return result;
};

export const crossorigins = ['anonymous','use-credentials','',undefined];

export class RewriteHTML {
	content_router = {
		script: (value, url, key, attrs) => {
			if(js_types.includes(get_mime(attrs.type || '')))return this.tomp.js.wrap(value, url, key);
			else return value;
		},
		style: (value, url, key, attrs) => {
			if(css_types.includes(get_mime(attrs.type || '')))return this.tomp.css.wrap(value, url, key);
			else return value;
		},
	};
	delete_attribute = Symbol();
	delete_node = Symbol();
	all_nodes = Symbol();
	set_attributes = Symbol();
	binary_src = (value, url, key, attrs) => {
		const resolved = new URL(value, url).href;
		return this.tomp.binary.serve(resolved, url, key);
	};
	html_src = (value, url, key, attrs) => {
		const resolved = new URL(value, url).href;
		return this.tomp.html.serve(resolved, url, key);
	};
	binary_srcset = (value, url, key, attrs) => {
		const parsed = parseSrcset(value);

		for(let src of parsed){
			const resolved = new URL(src.url, url).href;
			src.url = this.tomp.binary.serve(resolved, url, key);
		}

		return stringifySrcset(parsed);
	};
	crossorigin = urlattr => (value, url, key, attrs) => {
		if(urlattr in attrs){
			if('crossorigin' in attrs){
				if(!value)value = '';
			}
			attrs[urlattr] += '?crossorigin=' + crossorigins.indexOf(value).toString(16);

		}

		return 'use-credentials';
	};
	attribute_router = {
		[this.all_nodes]: {
			// on*
			style: (value, url, key, attrs) => {
				return this.tomp.css.wrap(value, url, key, true);
			},
		},
		use: {
			'xlink:href': this.html_src,
			'href': this.html_src,
		},
		script: {
			[this.set_attributes]: {
				crossorigin: this.crossorigin('src'),
			},
			// attrs const
			src: (value, url, key, attrs) => {
				const resolved = new URL(value, url).href;
				if(js_types.includes(get_mime(attrs.type || '')))return this.tomp.js.serve(resolved, url, key);
				else return this.tomp.binary.serve(resolved, url, key);
			},
			nonce: () => this.delete_attribute,	
			integrity: () => this.delete_attribute,	
		},
		iframe: {
			src: this.html_src,
		},
		img: {
			[this.set_attributes]: {
				crossorigin: this.crossorigin('src'),
			},
			src: this.binary_src,
			srcset: this.binary_srcset,
		},
		audio: {
			[this.set_attributes]: {
				crossorigin: this.crossorigin('src'),
			},
			src: this.binary_src,
		},
		source: {
			src: this.binary_src,
			srcset: this.binary_srcset,
		},
		video: {
			[this.set_attributes]: {
				crossorigin: this.crossorigin('src'),
			},
			src: this.binary_src,
			poster: this.binary_src,
		},
		a: {
			href: this.html_src,
		},
		link: {
			[this.set_attributes]: {
				crossorigin: this.crossorigin('href'),
			},
			href: (value, url, key, attrs) => {
				const resolved = new URL(value, url).href;
				
				switch(attrs.rel){
					case'preload':
						switch(attrs.as){
							case'style':
								return this.tomp.css.serve(resolved, url, key);
								break;
							case'worker':
							case'script':
								return this.tomp.js.serve(resolved, url, key);
								break;
							case'object':
							case'document':
								return this.tomp.html.serve(resolved, url, key);
								break;
							default:
								return this.tomp.binary.serve(resolved, url, key);
								break;
						}
						break;
					case'manifest':
						return this.tomp.manifest.serve(resolved, url, key);
						break;
					case'alternate':
					case'amphtml':
					// case'profile':
						return this.tomp.html.serve(resolved, url, key);
						break;
					case'stylesheet':
						return this.tomp.css.serve(resolved, url, key);
						break;
					default:
						return this.tomp.binary.serve(resolved, url, key);
						break;
				}
			},
			integrity: () => this.delete_attribute,
		},
		meta: {
			content: (value, url, key, attrs) => {
				const resolved = new URL(value, url).href;
				
				switch(attrs['http-equiv']){
					case'content-security-policy':
						return this.delete_node;
						break;
					case'refresh':
						return this.wrap_http_refresh(value, url, key);
						break;
				}
				
				switch(attrs.itemprop){
					case'image':
						return this.tomp.binary.serve(resolved, url, key);
						break;
				}

				switch(attrs.property){
					case'og:url':
					case'og:video:url':
					case'og:video:secure_url':
						return this.tomp.html.serve(resolved, url, key);
						break;
					case'og:image':
						return this.tomp.binary.serve(resolved, url, key);
						break;
				}

				switch(attrs.name){
					case'referrer':
						return this.delete_node;
						break;
					case'twitter:app:url:googleplay':
					case'twitter:url':
					case'parsely-link':
					case'parsely-image-url':
						return this.tomp.html.serve(resolved, url, key);
						break;
					case'twitter:image':
					case'sailthru.image.thumb':
					case'msapplication-TileImage':
						return this.tomp.binary.serve(resolved, url, key);
						break;
					case'style-tools':
						return this.tomp.css.serve(resolved, url, key);
						break;
					default:
						return value;
						break;
				}
			},
		},
	};
	constructor(tomp){
		this.tomp = tomp;
	}
	get_head(url, key){
		const nodes = [];

		if(!this.tomp.noscript){
			nodes.push({
				nodeName: 'script',
				tagName: 'script',
				childNodes: [
					{
						nodeName: '#text',
						value: `window.${global_client}=new ${global_client}(${JSON.stringify(this.tomp)},${JSON.stringify(key)})`,
					}
				],
				attrs: [],
			});
			
			nodes.push({
				nodeName: 'script',
				tagName: 'script',
				childNodes: [],
				attrs: [	
					{
						name: 'src',
						value: `${this.tomp.prefix}about:/]/static/main.js`,
					},
				],
			});
		}

		return nodes;
	}
	route_set_attributes(route, ctx, attrs, url, key){
		for(let name in route){
			try{
				const result = route[name](attrs[name], url, key, attrs);
				if(result == this.delete_attribute)delete attrs[name];
				else if(result == this.delete_node){
					ctx.detach();
					return false;
				}
				else attrs[name] = result;
			}catch(err){
				console.error(err);
				delete attrs[name];
			}
		}

		return true;
	}
	// returns false if the ctx was detached
	route_attributes(route, ctx, attrs, url, key){
		for(let name in route)if(name in attrs){
			try{
				const result = route[name](attrs[name], url, key, attrs);
				if(result == this.delete_attribute)delete attrs[name];
				else if(result == this.delete_node){
					ctx.detach();
					return false;
				}
				else attrs[name] = result;
			}catch(err){
				console.error(err);
				delete attrs[name];
			}
		}

		return true;
	}
	wrap(html, url, key){
		const ast = parse(html, {
			// https://github.com/inikulin/parse5/blob/master/packages/parse5/docs/options/parser-options.md#optional-scriptingenabled
			// <noscript>
			scriptingEnabled: false,
		});

		var inserted_script = false;

		var one_base = false;

		for(let ctx of new Parse5Iterator(ast)) {
			if(!ctx.node.attrs){ // #text node
				continue;
			}

			if(ctx.type == 'noscript' && this.tomp.noscript){
				// todo: move all noscript childNodes into the noscript parent
				ctx.node.tagName = 'span';
				continue;
			}

			let attrs = P5_attribute_object(ctx.node.attrs);
			// remove from memory
			delete ctx.node.attrs;
			
			if(ctx.type == 'base' && ctx.parent?.type == 'head' && !one_base){
				one_base = true;
				if(attrs.href)url = new URL(url, attrs.href);
				// todo handle target
				ctx.detach();
				continue;
			}

			if(Array.isArray(ctx.node?.childNodes) && ctx.type in this.content_router){
				const text = ctx.node?.childNodes[0];
				
				if(text?.value.match(/\S/) && text){
					const result = this.content_router[ctx.type](text.value, url, key, attrs);
					text.value = result;
				}
			}
			
			if(!this.route_attributes(this.attribute_router[this.all_nodes], ctx, attrs, url, key)){
				continue;
			}
			
			if(ctx.type in this.attribute_router){
				if(!this.route_attributes(this.attribute_router[ctx.type], ctx, attrs, url, key))continue;
				if(!this.route_set_attributes(this.attribute_router[ctx.type][this.set_attributes], ctx, attrs, url, key))continue;
			}

			if(!ctx.attached)continue;
			
			if(ctx.type == 'form'){
				const action_resolved = new URL(attrs.action || '', url).href;

				if(attrs.method?.toUpperCase() == 'POST'){
					attrs.action = this.tomp.html.serve(action_resolved, url, key);
				}else{
					attrs.action = this.tomp.form.serve(action_resolved, url, key);
				}
			}

			for(let name in attrs)if(name.startsWith('on')){
				attrs[name] = this.tomp.js.wrap(attrs[name], url, key);
			}
			
			ctx.node.attrs = P5_object_attrs(attrs);
			
			// todo: instead of first non essential node, do first live rewritten node (script, if node has on* tag)
			// on the first non-essential node (not html,head,or body), insert the client script before it
			if(!inserted_script && !essential_nodes.includes(ctx.type)){
				inserted_script = ctx.insert_before(...this.get_head(url, key));
			}
		}

		return serialize(ast);
	}
	// excellent resource
	// https://web.archive.org/web/20210514140514/https://www.otsukare.info/2015/03/26/refresh-http-header
	wrap_http_refresh(value, url, key){
		const urlstart = value.indexOf('url=');
		if(urlstart == -1)return value;

		var urlend = value.indexOf(';', urlstart);
		if(urlend == -1)urlend = value.indexOf(',', urlstart);
		if(urlend == -1)urlend = value.length;
		
		const resolved = new URL(value.slice(urlstart + 4, urlend), url).href;
		return value.slice(0, urlstart) + this.serve(resolved, url, key) + value.slice(urlend);
	}
	wrap_fragment(html, key){

	}
	unwrap(html, url, key){
		
		return html;
	}
	serve(serve, url, key){
		if(serve.startsWith('data:')){
			const [mime,buffer] = ParseDataURI(value);
			return this.wrap(buffer.toString(), url, key);
		}
		return this.tomp.url.wrap(serve, key, 'html');
	}
};