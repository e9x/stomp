import { serialize, parse, parseFragment } from 'parse5';
import { NodeTraverseIterator } from './NodeTraverseIterator.mjs';

const essential_nodes = ['#documentType', '#document', 'html','head','body'];
const js_mimes = ['text/javascript','application/javascript','module',undefined];

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

		for(let node of new NodeTraverseIterator(ast)) {
			if(node.tagName == 'script'){
				console.log(node);
				if (Array.isArray(node.attrs)) {
					let src;

					for(let attr of node.attrs) if (attr.name == 'src') {
						console.log(attr);
						src = attr;
						break;
					}
					
					if (src) {
						const src_resolved = new URL(src.value, url)
						const redirect = '/tomp/js/' + encodeURIComponent(this.tomp.wrap.wrap(src_resolved.href, key));
						
						src.value = redirect;
					}
				}

				// handle node.childNodes text
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