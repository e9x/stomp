import { ParseDataURI } from './DataURI.mjs'
import { serialize, parse, parseFragment } from 'parse5';
import { Parse5Iterator, Parse5AttributeMap } from './IterateParse5.mjs';
import { global_client } from './RewriteJS.mjs';
import { parseSrcset, stringifySrcset } from 'srcset';

const essential_nodes = ['#documentType','#document','#text','html','head','body'];

export const js_module_types = ['module'];
export const js_types = ['text/javascript','application/javascript','',...js_module_types];
export const css_types = ['text/css',''];
export const html_types = ['image/svg+xml', 'text/html',''];

export function get_mime(content_type){
	return content_type.split(';')[0];
}

export class RewriteHTML {
	content_router = {
		script: (value, url, attrs) => {
			const type = get_mime(attrs.get('type') || '').toLowerCase();
			
			if(js_types.includes(type)){
				return this.tomp.js.wrap(value, url);
			}else{
				return value;
			}
		},
		style: (value, url, attrs) => {
			const type = get_mime(attrs.get('type') || '').toLowerCase();
			
			if(css_types.includes(type))return this.tomp.css.wrap(value, url);
			else return value;
		},
	};
	delete_node = Symbol();
	all_nodes = Symbol();
	set_attributes = Symbol();
	binary_src = attr => (value, url, attrs) => {
		const resolved = new URL(value, url).href;
		attrs.set(attr, this.tomp.binary.serve(resolved, url));
	};
	html_src = attr => (value, url, attrs) => {
		const nurl = new URL(value, url);
		if(nurl.protocol == 'javascript:')return 'javascript:' + this.tomp.js.wrap(nurl.pathname, url);
		const resolved = nurl.href;
		attrs.set(attr, this.tomp.html.serve(resolved, url));
	};
	binary_srcset = attr => (value, url, attrs) => {
		const parsed = parseSrcset(value);

		for(let src of parsed){
			const resolved = new URL(src.url, url).href;
			src.url = this.tomp.binary.serve(resolved, url);
		}

		return stringifySrcset(parsed);
	};
	attribute_router = {
		[this.all_nodes]: {
			// on*
			style: (value, url, attrs) => {
				return this.tomp.css.wrap(value, url, true);
			},
		},
		use: {
			'xlink:href': this.html_src('xlink:href'),
			'href': this.html_src('href'),
		},
		script: {
			// attrs const
			src: (value, url, attrs) => {
				const type = get_mime(attrs.get('type') || '').toLowerCase();
				const resolved = new URL(value, url).href;
				
				if(js_types.includes(type)){
					attrs.set('src', this.tomp.js.serve(resolved, url));
				}else{
					attrs.set('src', this.tomp.binary.serve(resolved, url));
				}
			},
			nonce: (value, url, attrs) => {
				attrs.delete('nonce');
			},
			integrity: (value, url, attrs) => {
				attrs.delete('integrity');
			},
		},
		iframe: {
			src: this.html_src('src'),
		},
		img: {
			src: this.binary_src('src'),
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
			href: (value, url, attrs) => {
				const resolved = new URL(value, url).href;
				
				switch(attrs.get('rel')){
					case'preload':
						switch(attrs.get('as')){
							case'style':
								attrs.set('href', this.tomp.css.serve(resolved, url));
								return;
							case'worker':
							case'script':
								attrs.set('href', this.tomp.js.serve(resolved, url));
								return;
							case'object':
							case'document':
								attrs.set('href', this.tomp.html.serve(resolved, url));
								return;
							default:
								attrs.set('href', this.tomp.binary.serve(resolved, url));
								return;
						}
						break;
					case'manifest':
						attrs.set('href', this.tomp.manifest.serve(resolved, url));
						return;
					case'alternate':
					case'amphtml':
					// case'profile':
						attrs.set('href', this.tomp.html.serve(resolved, url));
						return;
					case'stylesheet':
						attrs.set('href', this.tomp.css.serve(resolved, url));
						return;
					default:
						attrs.set('href', this.tomp.binary.serve(resolved, url));
						return;
				}
			},
			integrity: (value, url, attrs) => {
				attrs.delete('integrity');
			},
		},
		meta: {
			content: (value, url, attrs) => {
				const resolved = new URL(value, url).href;
				
				switch(attrs.get('http-equiv')){
					case'content-security-policy':
						return this.delete_node;
					case'refresh':
						attrs.set('content', this.wrap_http_refresh(value, url));
						return;
				}
				
				switch(attrs.get('itemprop')){
					case'image':
						attrs.set('content', this.tomp.binary.serve(resolved, url));
						return;
						break;
				}

				switch(attrs.get('property')){
					case'og:url':
					case'og:video:url':
					case'og:video:secure_url':
						attrs.set('content', this.tomp.html.serve(resolved, url));
						return;
					case'og:image':
						attrs.set('content', this.tomp.binary.serve(resolved, url));
						return;
				}

				switch(attrs.get('name')){
					case'referrer':
						return this.delete_node;
					case'twitter:app:url:googleplay':
					case'twitter:url':
					case'parsely-link':
					case'parsely-image-url':
						attrs.set('content', this.tomp.html.serve(resolved, url));
						return;
					case'twitter:image':
					case'sailthru.image.thumb':
					case'msapplication-TileImage':
						attrs.set('content', this.tomp.binary.serve(resolved, url));
						return;
					case'style-tools':
						attrs.set('content', this.tomp.css.serve(resolved, url));
						return;
				}
			},
		},
	};
	constructor(tomp){
		this.tomp = tomp;
	}
	get_head(url){
		const nodes = [];

		if(!this.tomp.noscript){
			nodes.push({
				nodeName: 'script',
				tagName: 'script',
				childNodes: [],
				attrs: [
					{
						name: 'src',
						value: `${this.tomp.directory}client.js`,
					},
				],
			});
			
			nodes.push({
				nodeName: 'script',
				tagName: 'script',
				childNodes: [
					{
						nodeName: '#text',
						value: `window.${global_client}=new ${global_client}(${JSON.stringify(this.tomp)})`,
					}
				],
				attrs: [],
			});
		}

		return nodes;
	}
	// returns false if the ctx was detached
	route_attributes(route, ctx, attrs, url, test_has){
		for(let name in route)if(!test_has || attrs.has(name)){
			try{
				const result = route[name](attrs.get(name), url, attrs);
				
				if(result == this.delete_node){
					ctx.detach();
					return false;
				}
			}catch(err){
				this.tomp.log.error(err);
				attrs.delete(name);
			}
		}

		return true;
	}
	wrap(html, url){
		const ast = parse(html, {
			// https://github.com/inikulin/parse5/blob/master/packages/parse5/docs/options/parser-options.md#optional-scriptingenabled
			// <noscript>
			scriptingEnabled: false,
		});
			
		let inserted_script = false;

		let one_base = false;

		for(let ctx of new Parse5Iterator(ast)) {
			if(!ctx.node.attrs){ // #text node
				continue;
			}

			if(ctx.type == 'noscript' && this.tomp.noscript){
				ctx.node.tagName = 'span';
				continue;
			}

			let attrs = new Parse5AttributeMap(ctx.node.attrs);
			
			if(ctx.type == 'base' && ctx.parent?.type == 'head' && !one_base){
				one_base = true;
				if(attrs.has('href'))try{
					url = new URL(attrs.get('href'), url);
				}catch(err){
					this.tomp.log.error(err);
				}
				// todo: handle target
				ctx.detach();
				continue;
			}

			if(Array.isArray(ctx.node?.childNodes) && ctx.type in this.content_router){
				const text = ctx.node?.childNodes[0];
				
				if(text?.value.match(/\S/) && text){
					const result = this.content_router[ctx.type](text.value, url, attrs);
					text.value = result;
				}
			}
			
			if(!this.route_attributes(this.attribute_router[this.all_nodes], ctx, attrs, url)){
				continue;
			}
			
			if(ctx.type in this.attribute_router){
				if(!this.route_attributes(this.attribute_router[ctx.type], ctx, attrs, url))continue;
				if(!this.route_attributes(this.attribute_router[ctx.type][this.set_attributes], ctx, attrs, url, true))continue;
			}
			
			if(ctx.type == 'form'){
				const action_resolved = new URL(attrs.get('action') || '', url).href;
				
				if(attrs.get('method')?.toUpperCase() == 'POST'){
					attrs.set('method', this.tomp.html.serve(action_resolved, url));
				}else{
					attrs.set('method', this.tomp.form.serve(action_resolved, url));
				}
			}

			for(let [ name, value ] of attrs)if(name.startsWith('on')){
				attrs.set(name, this.tomp.js.wrap(value, url));
			}
			
			// todo: instead of first non essential node, do first live rewritten node (script, if node has on* tag)
			// on the first non-essential node (not html,head,or body), insert the client script before it
			if(!inserted_script && !essential_nodes.includes(ctx.type)){
				inserted_script = ctx.insert_before(...this.get_head(url));
			}

			attrs.sync();
		}

		return serialize(ast);
	}
	// excellent resource
	// https://web.archive.org/web/20210514140514/https://www.otsukare.info/2015/03/26/refresh-http-header
	wrap_http_refresh(value, url){
		const urlstart = value.indexOf('url=');
		if(urlstart == -1)return value;

		var urlend = value.indexOf(';', urlstart);
		if(urlend == -1)urlend = value.indexOf(',', urlstart);
		if(urlend == -1)urlend = value.length;
		
		const resolved = new URL(value.slice(urlstart + 4, urlend), url).href;
		return value.slice(0, urlstart) + this.serve(resolved, url) + value.slice(urlend);
	}
	wrap_fragment(html){

	}
	unwrap(html, url){
		
		return html;
	}
	serve(serve, url){
		serve = serve.toString();
		if(serve.startsWith('data:')){
			const {mime,data} = ParseDataURI(serve);
			return `data:${mime},${encodeURIComponent(this.wrap(data, url))}`;
		}
		return this.tomp.url.wrap(serve, 'worker:html');
	}
};