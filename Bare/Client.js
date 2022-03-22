export const forbids_body = ['GET','HEAD'];
export const status_empty = [101,204,205,304];
export const status_redirect = [300,301,302,303,304,305,306,307,308];

export default class Client {
	constructor(bare){
		this.bare = bare;
		this.version = this.constructor.version;
		this.base = new URL(`./v${this.version}/`, this.bare.server);
	}
	async fetch(){
		throw new Error('Not implemented');
	}
	async connect(){
		throw new Error('Not implemented');
	}
};
