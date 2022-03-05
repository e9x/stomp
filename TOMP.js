import { RewriteURL } from './RewriteURL.js';
import { RewriteJS } from './RewriteJS.js';
import { RewriteCSS } from './RewriteCSS.js';
import { RewriteHTML } from './RewriteHTML.js';
import { RewriteSVG } from './RewriteSVG.js';
import { RewriteForm } from './RewriteForm.js';
import { RewriteElements } from './RewriteElements.js';
import { RewriteManifest } from './RewriteManifest.js';
import { RewriteBinary } from './RewriteBinary.js';
import { Logger, LOG_WARN } from './Logger.js';

export default class TOMP {
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
		this.svg = new RewriteSVG(this);
		this.form = new RewriteForm(this);
		this.manifest = new RewriteManifest(this);
		this.elements = new RewriteElements(this);
	}
};