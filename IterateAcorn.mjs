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
	// If the parent was modified, this function will return new AcornContext if there is only 1 node to replace with, otherwise it will return true, if the parent wasn't modified then it will return false.
	replace_with(...nodes){
		if(this.root)throw new RangeError('Cannot replace the root.');
		else if(!this.attached)throw new RangeError('Cannot replace a detached node.');
		
		if(this.parent_array){
			let place = this.parent_object.indexOf(this.node);
			if(place == -1) return false;
			this.parent_object.splice(place, 1, ...nodes);
		}else{
			if(nodes.length > 1)throw new RangeError('Replacing property with multiple nodes.');

			delete this.parent.node[this.parent_key];
			this.parent.node[this.parent_key] = nodes[0];
		}

		this.attached = false;
		
		if(nodes.length == 1){
			let created = new AcornContext(nodes, this.parent, this.parent_key);
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
					if(typeof sv?.type == 'string')entries.push([key,sv]);
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