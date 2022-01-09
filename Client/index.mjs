import { TOMP } from '../TOMP.mjs'

export class Client {
	constructor(config = {}){
		this.tomp = new TOMP(config);
	}
};