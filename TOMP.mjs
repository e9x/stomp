import { WrapInterface, PlainWrap, XORWrap, RC4Wrap } from './URLWrap.mjs'

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
	static URLs = [ PlainWrap, XORWrap, RC4Wrap ];
	toJSON(){
		return {
			url: TOMP.urls.indexOf(this.url),
			prefix: this.prefix,
		};
	}
	prefix = '/tomp/';
	url = new PlainWrap();
	constructor(config){
		if(typeof config.prefix == 'string'){
			this.prefix = config.prefix;
		}

		if(typeof config.url == 'number'){
			config.url = TOMP.urls[config.url];
		}

		if(config.url instanceof WrapInterface.constructor){
			this.url = config.url;
		}
		
		this.log = new Logger(config.silent);
	}
};