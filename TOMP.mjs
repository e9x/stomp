import { RewriteURL } from './RewriteURL.mjs';
import { RewriteJS } from './RewriteJS.mjs';
import { RewriteCSS } from './RewriteCSS.mjs';
import { RewriteHTML } from './RewriteHTML.mjs';
import { RewriteForm } from './RewriteForm.mjs';
import { RewriteManifest } from './RewriteManifest.mjs';
import { RewriteBinary } from './RewriteBinary.mjs';
import { Logger, LOG_WARN } from './Logger.mjs';

export class TOMP {
	toJSON(){
		return {
			directory: this.directory,
			bare: this.bare,
			noscript: this.noscript,
			loglevel: this.loglevel,
		};
	}
	directory = '';
	bare = '';
	loglevel = LOG_WARN;
	noscript = false;
	constructor(config){
		if(typeof config.directory != 'string'){
			throw new Error('Directory must be specified.')
		}

		if(typeof config.bare != 'string'){
			throw new Error('Bare server URL must be specified.')
		}
		
		this.directory = config.directory;
		this.bare = config.bare;

		if(typeof config.loglevel == 'number'){
			this.loglevel = config.loglevel;
		}

		if(config.noscript == true){
			this.noscript = true;
		}

		this.log = new Logger(this.loglevel);
		this.url = new RewriteURL(this);
		this.js = new RewriteJS(this);
		this.css = new RewriteCSS(this);
		this.html = new RewriteHTML(this);
		this.binary = new RewriteBinary(this);
		this.form = new RewriteForm(this);
		this.manifest = new RewriteManifest(this);
	}
};