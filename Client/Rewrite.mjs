// Base class for a client rewrite

export class Rewrite {
	constructor(client, global){
		this.client = client;
		this.tomp = this.client.tomp;
		this.global = global;
		this.add();
	}
	add(){
		throw new Error('.add() not implemented');
	}
};