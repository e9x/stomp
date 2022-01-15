import { ParseDataURI } from './DataURI.mjs'
import { serialize, parse, parseFragment } from 'parse5';
import { Parse5Iterator } from './IterateParse5.mjs';

const essential_nodes = ['#documentType','#document','#text','html','head','body'];
const js_types = ['text/javascript','text/javascript','application/javascript','module',''];
const css_types = ['text/css',''];

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

function get_mime(content_type){
	return content_type.split(';')[0];
}

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
	attribute_router = {
		script: {
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
			src: (value, url, key, attrs) => {
				const resolved = new URL(value, url).href;
				return this.tomp.html.serve(resolved, url, key);
			},
		},
		img: {
			src: (value, url, key, attrs) => {
				const resolved = new URL(value, url).href;
				return this.tomp.binary.serve(resolved, url, key);
			},
		},
		a: {
			href: (value, url, key, attrs) => {
				const resolved = new URL(value, url).href;
				return this.tomp.html.serve(resolved, url, key);
			},
		},
		link: {
			href: (value, url, key, attrs) => {
				const resolved = new URL(value, url).href;
				
				switch(attrs.rel){
					case'alternate':
					case'amphtml':
						return this.tomp.html.serve(resolved, url, key);
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
				
				switch(attrs.name){
					case'og:url':
					case'twitter:url':
					case'parsely-link':
					case'parsely-image-url':
					
						return this.tomp.html.serve(resolved, url, key);
						break;
					case'og:image':
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
	get head(){
		return {
			nodeName: 'script',
			tagName: 'script',
			childNodes: [],
			attrs: [
				{
					name: 'src',
					value: this.tomp.prefix + 'script',
				},
			],
		};
	}
	wrap(html, url, key){	
		const ast = parse(html);

		var inserted_script = false;

		for(let ctx of new Parse5Iterator(ast)) {
			if(!ctx.node.attrs)continue;

			let attrs = P5_attribute_object(ctx.node.attrs);
			// remove from memory
			delete ctx.node.attrs;

			if(Array.isArray(ctx.node?.childNodes) && ctx.type in this.content_router){
				const text = ctx.node?.childNodes[0];

				if(text){
					text.value = this.content_router[ctx.type](text.value, url, key, attrs);
				}
			}
			
			if(ctx.type in this.attribute_router)for(let name in this.attribute_router[ctx.type])if(name in attrs){
				const result = this.attribute_router[ctx.type][name](attrs[name], url, key, attrs);
				if(result == this.delete_attribute)delete attrs[name];
				else attrs[name] = result;
			}
			
			for(let name in attrs)if(name.startsWith('on')){
				attrs[name] = this.tomp.js.wrap(value, url, key);
			}

			ctx.node.attrs = P5_object_attrs(attrs);
			
			// todo: instead of first non essential node, do first live rewritten node (script, if node has on* tag)
			// on the first non-essential node (not html,head,or body), insert the client script before it
			if(!inserted_script && !essential_nodes.includes(ctx.type)){
				this.tomp.log.debug('inserting head injection into', ctx.type);
				inserted_script = ctx.insert_before(this.head);
			}
		}

		return serialize(ast);
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
		return `${this.tomp.prefix}html/${encodeURIComponent(this.tomp.codec.wrap(serve, key))}`
	}
};