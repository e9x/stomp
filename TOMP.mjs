import { RewriteJS } from './RewriteJS.mjs';
import { RewriteCSS } from './RewriteCSS.mjs';
import { RewriteHTML } from './RewriteHTML.mjs';
import { Logger } from './Logger.mjs'
import { CodecInterface, PlainCodec, XORCodec, RC4Codec } from './Codec.mjs'

const codecs = [ PlainCodec, XORCodec, RC4Codec ];

export class TOMP {
	toJSON(){
		return {
			codec: codecs.indexOf(this.wrap),
			prefix: this.prefix,
		};
	}
	prefix = '/tomp/';
	codec = PlainCodec;
	loglevel = 0;
	constructor(config){
		if(typeof config.prefix == 'string'){
			this.prefix = config.prefix;
		}

		if(typeof config.codec == 'number'){
			config.codec = codecs[config.codec];
		}

		if(config.codec instanceof CodecInterface.constructor){
			this.codec = config.codec;
		}

		if(typeof config.loglevel == 'number'){
			this.loglevel = config.loglevel;
		}

		this.log = new Logger(this);
		this.js = new RewriteJS(this);
		this.css = new RewriteCSS(this);
		this.html = new RewriteHTML(this);
	}
};