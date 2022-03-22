import RewriteURL from './RewriteURL.js';
import RewriteJS from './RewriteJS.js';
import RewriteCSS from './RewriteCSS.js';
import RewriteHTML from './RewriteHTML.js';
import RewriteSVG from './RewriteSVG.js';
import RewriteForm from './RewriteForm.js';
import RewriteElements from './RewriteElements.js';
import RewriteManifest from './RewriteManifest.js';
import RewriteBinary from './RewriteBinary.js';
import { PlainCodec, XORCodec } from './Codec.js';
import Logger, { LOG_WARN } from './Logger.js';

const codecs = [PlainCodec, XORCodec];

export * from './TOMPConstants.js';

export default class TOMP {
	toJSON(){
		if(this.key === ''){
			throw new Error('Cannot serialize TOMP: Key not set');
		}

		return {
			directory: this.directory,
			bare: this.bare,
			origin: this.origin,
			key: this.key,
			noscript: this.noscript,
			loglevel: this.loglevel,
			codec: this.codec_index,
		};
	}
	directory = '';
	// real origin of the TOMP instance eg http://localhost
	origin = '';
	// codec key such as xor value
	key = '';
	bare = '';
	loglevel = LOG_WARN;
	noscript = false;
	codec = PlainCodec;
	codec_index = 0;
	constructor(config){
		if(typeof config.codec === 'number'){
			if(config.codec < 0 || config.codec > codecs.length){
				throw new RangeError('Bad Codec ID');
			}

			this.codec_index = config.codec;
			this.codec = codecs[config.codec];
		}
		
		if(typeof config.directory !== 'string'){
			throw new Error('Directory must be specified.')
		}

		if(typeof config.bare !== 'string'){
			throw new Error('Bare server URL must be specified.')
		}
		
		if(typeof config.origin !== 'string'){
			throw new Error('Origin must be specified.')
		}
		
		// serviceworker can set config.key once db is loaded
		// client MUST specify config.key
		if(typeof config.key === 'string'){
			this.key = config.key;
		}
		
		this.origin = config.origin;
		this.directory = config.directory;
		this.bare = config.bare;

		if(typeof config.loglevel == 'number'){
			this.loglevel = config.loglevel;
		}

		if(config.noscript === true){
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
	wrap(data){
		if(this.key === ''){
			throw new Error('Cannot wrap: Key not set');
		}

		return this.codec.wrap(data, this.key);
	}
	unwrap(data){
		if(this.key === ''){
			throw new Error('Cannot unwrap: Key not set');
		}

		return this.codec.unwrap(data, this.key);
	}
};