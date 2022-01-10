import { TOMP } from '../TOMP.mjs'

export class Client {
	#key
	get_key(placeholder){
		return this.#key;
	}
	constructor(config = {}, key){
		this.tomp = new TOMP(config);
		this.#key = key;
	}
};