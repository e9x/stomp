import { HTMLRewriter } from './HTMLRewriter.mjs';
import { WrapInterface, PlainWrap, XORWrap, RC4Wrap } from './Wrap.mjs'
import { Logger } from './Logger.mjs'

export class TOMP {
	static wraps = [ PlainWrap, XORWrap, RC4Wrap ];
	toJSON(){
		return {
			wrap: TOMP.wraps.indexOf(this.wrap),
			prefix: this.prefix,
		};
	}
	prefix = '/tomp/';
	wrap = new PlainWrap();
	loglevel = 0;
	constructor(config){
		if(typeof config.prefix == 'string'){
			this.prefix = config.prefix;
		}

		if(typeof config.wrap == 'number'){
			config.wrap = TOMP.wraps[config.wrap];
		}

		if(config.wrap instanceof WrapInterface.constructor){
			this.wrap = config.wrap;
		}

		if(typeof config.loglevel == 'number'){
			this.loglevel = config.loglevel;
		}

		this.log = new Logger(this);
		this.html = new HTMLRewriter(this);
	}
};