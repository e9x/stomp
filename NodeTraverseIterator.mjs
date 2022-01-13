export class NodeTraverseIterator {
	constructor(ast){
		this.stack = [ast];
	}
	next(){
		if(!this.stack.length) return { value: undefined, done: true };
		
		const node = this.stack.pop();

		if(Array.isArray(node.childNodes)) this.stack.push(...[...node.childNodes].reverse());

		return { value: node, done: false };
	}
	[Symbol.iterator](){
		return this;
	}
}