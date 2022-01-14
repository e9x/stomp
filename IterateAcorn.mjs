export class AcornIterator {
	constructor(ast){
		this.stack = [ast];
	}
	next(){
		if(!this.stack.length) return { value: undefined, done: true };
		
		const node = this.stack.pop();

		for(let [prop,value] of Object.entries(node).reverse()){
			if(typeof value?.type == 'string')this.stack.push(value);
		}
		
		return { value: node, done: false };
	}
	[Symbol.iterator](){
		return this;
	}
}