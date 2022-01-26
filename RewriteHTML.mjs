import { ParseDataURI } from './DataURI.mjs'
import { serialize, parse, parseFragment } from 'parse5';
import { Parse5Iterator } from './IterateParse5.mjs';
import { global_client } from './RewriteJS.mjs';
import { TOMPElement } from './RewriteElements.mjs';

const essential_nodes = ['#documentType','#document','#text','html','head','body'];

class TOMPElementParse5 extends TOMPElement {
	#ctx = {};
	constructor(ctx){
		super();
		
		this.#ctx = ctx;

		for(let { name, value } of this.#ctx.node.attrs){
			if(!this.attributes.has(name))this.attributes.set(name, value);
		}

		this.#ctx.node.attrs.length = 0;
	}
	get type(){
		return this.#ctx.node.nodeName;
	}
	set type(value){
		this.#ctx.node.tagName = value;
		this.#ctx.node.nodeName = value;
		return value;
	}
	get detached(){
		return this.#ctx.detached;
	}
	detach(){
		this.#ctx.detach();
	}
	sync(){
		this.#ctx.node.attrs.length = 0;
		
		for(let [ name, value ] of this.attributes){
			if(typeof value != 'string')throw new TypeError(`Attribute ${name} was not a string.`);
			this.#ctx.node.attrs.push({ name, value });
		}
	}
	get text(){
		return this.#ctx.node?.childNodes[0]?.value;
	}
	set text(value){
		this.#ctx.node.childNodes = [
			{
				nodeName: '#text',
				value,
				parentNode: this.#ctx.node,
			},
		];
	}
	get parent(){
		return new TOMPElementParse5(this.#ctx.parent);
	}
};

export class RewriteHTML {
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
						value: `${global_client}(${JSON.stringify(this.tomp)})`,
					}
				],
				attrs: [],
			});
		}

		return nodes;
	}
	wrap(html, url){
		const ast = parse(html, {
			// https://github.com/inikulin/parse5/blob/master/packages/parse5/docs/options/parser-options.md#optional-scriptingenabled
			// <noscript>
			scriptingEnabled: false,
		});
			
		let inserted_script = false;
		
		const persist = {};

		for(let ctx of new Parse5Iterator(ast)) {
			if(!ctx.node.attrs){ // #text node
				continue;
			}

			let element = new TOMPElementParse5(ctx);
			
			this.tomp.elements.wrap(element, url, persist);
			
			// todo: instead of first non essential node, do first live rewritten node (script, if node has on* tag)
			// on the first non-essential node (not html,head,or body), insert the client script before it
			if(!inserted_script && !essential_nodes.includes(ctx.node.nodeName)){
				inserted_script = ctx.insert_before(...this.get_head(url));
			}

			element.sync();
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