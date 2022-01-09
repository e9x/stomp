import { HTMLRewriter } from './HTMLRewriter.mjs';
import { WrapInterface, PlainWrap, XORWrap, RC4Wrap } from './Wrap.mjs'

// CACHE THE CONSOLE
// CONSOLE.CONTEXT ISOLATE
// FIREFOX
class Logger {
	constructor(silent){
		this.silent = silent;
	}
	info(...args){
		if(!this.silent)console.info('[TOMP]', ...args);
	}
	warn(...args){
		if(!this.silent)console.warn('[TOMP]', ...args);
	}
	error(...args){
		if(!this.silent)console.error('[TOMP]', ...args);
	}
	trace(...args){
		if(!this.silent)console.trace('[TOMP]', ...args);
	}
};

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
		
		this.log = new Logger(config.silent);
		this.html = new HTMLRewriter();
	}
};