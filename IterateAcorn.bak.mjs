export class AcornContext {
	root = false;
	attached = false;
	constructor(node, parent, root){
		this.node = node;

		if(parent instanceof AcornContext){
			this.parent = parent;
			this.attached = true;
		}else if(!root){
			throw new TypeError(`New parent isnt an instance of AcornContext.`);
		}

		if(root == true)this.root = true;
	}
	get type(){
		return this.node.nodeName;
	}
	// returns new context if this node is attached and in parent, false otherwise
	replace_with(node){
		if(this.root)throw new RangeError('Cannot replace the root.');
		else if(!this.attached)throw new RangeError('Cannot replace a detached node.');
		
		let place = this.parent.node.childNodes.indexOf(this.node);
		if(place == -1) return false;
		this.parent.node.childNodes.splice(place, 0, node);
		this.attached = false;
		delete this.parent;
		return new AcornContext(node, this.parent);
	}
};

export class AcornIterator {
	constructor(ast){
		this.stack = [new AcornContext(ast, undefined, true)];
	}
	next(){
		if(!this.stack.length) return { value: undefined, done: true };
		
		const context = this.stack.pop();

		if(Array.isArray(context.node.childNodes)) {
			// insert new contexts in reverse order
			// not cloning arrays then reversing in the interest of optimization
			let start = this.stack.length - 1,
				length = context.node.childNodes.length;
			
			for(let [key, value] of Object.entries(context.node)){
				if(typeof value?.type == 'string')
				this.stack[start + length--] = new AcornContext(node, context);
			}
		}

		return { value: context, done: false };
	}
	[Symbol.iterator](){
		return this;
	}
}