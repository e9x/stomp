import { serialize, parse, parseFragment } from 'parse5';
import { Parse5Iterator } from './IterateParse5.mjs';

const essential_nodes = ['#documentType', '#document', 'html','head','body'];
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

		var last_parent = ast;
		// last_parent.childNodes must be accessible

		var inserted_script = false;

		for(let node of new Parse5Iterator(ast)) {
			if(node.tagName == 'script'){
				console.log(node);
				let src;
				let type;
				let text = node?.childNodes[0];
					
				if (Array.isArray(node.attrs)) {
					for(let attr of node.attrs) if (attr.name == 'src') {
						src = attr;
						break;
					}

					for(let attr of node.attrs) if (attr.name == 'type') {
						type = attr;
						break;
					}
				}
				
				if(!type || js_types.includes(type.value))
				
				if (src) {
					const src_resolved = new URL(src.value, url)
					const redirect = '/tomp/js/' + encodeURIComponent(this.tomp.codec.wrap(src_resolved.href, key));
					
					src.value = redirect;
				}
				else if(text) {
					text.value = this.tomp.js.wrap(text.value, url, key);
				}
			}
			
			// todo: instead of first non essential node, do first live rewritten node (script, if node has on* tag)
			// on the first non-essential node (not html,head,or body), insert the client script before it
			if(!inserted_script && !essential_nodes.includes(node.nodeName)){
				let place = last_parent.childNodes.indexOf(node);

				if(place != -1){
					this.tomp.log.info('inserting', place, node.nodeName);
					last_parent.childNodes.splice(place, 0, this.head);
					inserted_script = true;
				}
				else console.log('place was -1', node, last_parent);
			}

			last_parent = node;
		}

		return serialize(ast);
	}
	wrap_fragment(html, key){

	}
	unwrap(html, url, key){
		
		return html;
	}
};