import { JSRewriter } from './JSRewriter.mjs';
import { HTMLRewriter } from './HTMLRewriter.mjs';
import { WrapInterface, PlainWrap, XORWrap, RC4Wrap } from './URLWrap.mjs'
import { Logger } from './Logger.mjs'

const urlwraps = [ PlainWrap, XORWrap, RC4Wrap ];

export class TOMP {
	toJSON(){
		return {
			wrap: TOMP.wraps.indexOf(this.wrap),
			prefix: this.prefix,
		};
	}
	prefix = '/tomp/';
	url = new PlainWrap();
	loglevel = 0;
	constructor(config){
		if(typeof config.prefix == 'string'){
			this.prefix = config.prefix;
		}

		if(typeof config.url == 'number'){
			config.url = urlwraps[config.url];
		}

		if(config.url instanceof WrapInterface.constructor){
			this.url = config.url;
		}

		if(typeof config.loglevel == 'number'){
			this.loglevel = config.loglevel;
		}

		this.log = new Logger(this);
		this.js = new JSRewriter(this);
		this.html = new HTMLRewriter(this);
	}
};