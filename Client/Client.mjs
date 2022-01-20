import { TOMP } from '../TOMP.mjs'
import { Define } from './Define.mjs'

export class Client {
	constructor(config){
		this.tomp = new TOMP(config);
		this.window = {};
		this.define = new Define(this);
		this.with = this.create_with();
	}
	// make new Proxy
	create_with(){
		const that = this;

		return {
			// with(x.ctx)
			// window = null; console.log(window);
			get window(){
				return that.window;
			}
		};	
	}
};