import { RewriteURL } from './RewriteURL.mjs';
import { RewriteJS } from './RewriteJS.mjs';
import { RewriteCSS } from './RewriteCSS.mjs';
import { RewriteHTML } from './RewriteHTML.mjs';
import { RewriteForm } from './RewriteForm.mjs';
import { RewriteManifest } from './RewriteManifest.mjs';
import { RewriteBinary } from './RewriteBinary.mjs';
import { Logger } from './Logger.mjs';

export class TOMP {
	toJSON(){
		return {
			prefix: this.prefix,
			noscript: this.noscript,
			loglevel: this.loglevel,
		};
	}
	prefix = '/tomp/';
	loglevel = 0;
	noscript = false;
	constructor(config){
		if(typeof config.prefix == 'string'){
			this.prefix = config.prefix;
		}
		
		if(typeof config.loglevel == 'number'){
			this.loglevel = config.loglevel;
		}

		if(config.noscript == true){
			this.noscript = true;
		}

		this.log = new Logger(this);
		this.url = new RewriteURL(this);
		this.js = new RewriteJS(this);
		this.css = new RewriteCSS(this);
		this.html = new RewriteHTML(this);
		this.binary = new RewriteBinary(this);
		this.form = new RewriteForm(this);
		this.manifest = new RewriteManifest(this);
	}
};