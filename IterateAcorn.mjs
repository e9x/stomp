export const delete_from_stack = Symbol();

export class AcornContext {
	root = false;
	attached = false;
	constructor(node, parent, parent_key, root){
		this.node = node;

		if(parent instanceof AcornContext){
			this.parent = parent;
			this.parent_key = parent_key;
			this.attached = true;
		}else if(!root){
			throw new TypeError(`New parent isnt an instance of AcornContext.`);
		}

		if(root == true)this.root = true;
	}
	// only used by array() and index()
	get parent_object(){
		return this.parent.node[this.parent_key];
	}
	get parent_array(){
		return Array.isArray(this.parent_object);
	}
	get parent_index(){
		if(!this.parent_array){
			throw new Error('Not an array');
		}
		
		return this.parent_object.indexOf(this.node);
	}
	get type(){
		return this.node.type;
	}
	// returns true if there is 1 node to replace with and if this node is attached and in parent, false otherwise
	replace_with(...node){
		if(this.root)throw new RangeError('Cannot replace the root.');
		else if(!this.attached)throw new RangeError('Cannot replace a detached node.');
		
		if(this.parent_array){
			let place = this.parent_object.indexOf(this.node);
			if(place == -1) return false;
			this.parent_object.splice(place, 1, ...node);
		}else{
			delete this.parent.node[this.parent_key];
		}

		this.attached = false;
		
		if(node.length == 1){
			let created = new AcornContext(node, this.parent, this.parent_key);
			delete this.parent;
			return created;
		}else{
			return true;
		}
	}
};

export class AcornIterator {
	constructor(ast){
		this.stack = [new AcornContext(ast, undefined, undefined, true)];
	}
	next(){
		if(!this.stack.length) return { value: undefined, done: true };
		
		var context;
		while(context = this.stack.pop(), context.node[delete_from_stack]);
		
		const entries = [];
		
		for(let [key, value] of Object.entries(context.node)){
			if(typeof value?.type == 'string')entries.push([key,value]);
			else if(Array.isArray(value)){
				for(let sv of value){
					entries.push([key,sv]);
				}
			}
		}

		let start = this.stack.length - 1,
			length = entries.length;
		
		for(let [key, node] of entries){
			this.stack[start + length--] = new AcornContext(node, context, key);
		}

		return { value: context, done: false };
	}
	[Symbol.iterator](){
		return this;
	}
}