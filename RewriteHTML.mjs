import { serialize, parse, parseFragment } from 'parse5';
import { Parse5Iterator } from './IterateParse5.mjs';

const essential_nodes = ['#documentType','#document','#text','html','head','body'];
const js_types = ['text/javascript','text/javascript','application/javascript','module',undefined];
const css_types = ['text/css',undefined];

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
	constructor(tomp){
		this.tomp = tomp;
		
		this.content_router = {
			script: (value, url, key, attrs) => {
				if(js_types.includes(get_mime(attrs.type || '')))return this.tomp.js.wrap(value, url, key);
				else return value;
			},
			style: (value, url, key, attrs) => {
				if(css_types.includes(get_mime(attrs.type || '')))return this.tomp.css.wrap(value, url, key);
				else return value;
			},
		};
		
		this.attribute_router = {
			script: {
				// attrs const
				src: (value, url, key, attrs) => {
					const resolved = new URL(value, url).href;
					if(js_types.includes(get_mime(attrs.type || '')))return this.tomp.js.serve(resolved, key);
					else return this.tomp.binary.serve(resolved, key);
				},
			},
			iframe: {
				src: (value, url, key, attrs) => {
					const resolved = new URL(value, url).href;
					return this.tomp.html.serve(resolved, key);
				},
			},
			img: {
				src: (value, url, key, attrs) => {
					const resolved = new URL(value, url).href;
					return this.tomp.binary.serve(resolved, key);
				},
			},
			a: {
				href: (value, url, key, attrs) => {
					const resolved = new URL(value, url).href;
					return this.tomp.html.serve(resolved, key);
				},
			},
			link: {
				href: (value, url, key, attrs) => {
					const resolved = new URL(value, url).href;
					
					switch(attrs.rel){
						case'alternate':
							return this.tomp.html.serve(resolved, key);
							break;
						default:
							return this.tomp.binary.serve(resolved, key);
							break;
					}
				},
			},
		};
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
				attrs[name] = result;
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
	serve(url, key){
		return `${this.tomp.prefix}html/${encodeURIComponent(this.tomp.codec.wrap(url, key))}`
	}
};