import { serialize, parse, parseFragment } from 'parse5';
import { NodeTraverseIterator } from './NodeTraverseIterator.mjs';

const essential_nodes = ['#documentType', '#document', 'html','head','body'];

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
	wrap(html, key){	
		const ast = parse(html);

		var last_parent = ast;
		// last_parent.childNodes must be accessible

		var inserted_script = false;

		for(let node of new NodeTraverseIterator(ast)) {
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
	unwrap(html, key){
		
		return html;
	}
};