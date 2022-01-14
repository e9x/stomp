import { serialize, parse, parseFragment } from 'parse5';
import { Parse5Iterator } from './IterateParse5.mjs';

const essential_nodes = ['#documentType','#document','#text','html','head','body'];
const js_types = ['text/javascript','application/javascript','module',undefined];

export class HTMLRewriter {
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
			if(ctx.type == 'script'){;
				let src;
				let type;
				let text = ctx.node?.childNodes[0];
					
				if (Array.isArray(ctx.node.attrs)) {
					for(let attr of ctx.node.attrs) if (attr.name == 'src') {
						src = attr;
						break;
					}

					for(let attr of ctx.node.attrs) if (attr.name == 'type') {
						type = attr;
						break;
					}
				}
				
				if(!type || js_types.includes(type.value)) {
					if (src) {
						const src_resolved = new URL(src.value, url)
						src.value = this.tomp.js.serve(src_resolved.href);
					}
					else if(text) {
						text.value = this.tomp.js.wrap(text.value, url, key);
					}
				}
			}
			
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