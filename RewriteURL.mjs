import messages from './Messages.mjs';

// WIP
export const protocols =     ['http:','https:', 'blob:http:', 'blob:https:'];
export const default_ports = [80     ,443     , 80,         , 443];

export class ParsedRewrittenURL {
	toString(){
		let port = '';
		if(!default_ports.includes(this.port)){
			port = `:${this.port}`;
		}
		
		return `${this.protocol}//${this.host}${port}${this.path}`;
	}
};

export class RewriteURL {
	constructor(tomp){
		this.tomp = tomp;
	}
	parse_url(url){
		url = String(url);

		const blob = url.startsWith('blob:');
		if(blob)url = url.slice(5);

		const created = new URL(url);

		const obj = {
			port: created.port,
			search: created.search,
			hash: created.hash,
			host: created.host,
			hostname: created.hostname,
			protocol: created.protocol,
			pathname: created.pathname,
			username: created.username,
			password: created.password,	
			href: created.href,
		};
		
		if(blob){
			obj.protocol = 'blob:' + obj.protocol;
		}

		return obj;
	}
	wrap(url, service){
		url = this.parse_url(url);
		
		const protoi = protocols.indexOf(url.protocol);
		var port = parseInt(url.port);
		if(isNaN(port))port = default_ports[protoi];
		
		// android-app, ios-app, mailto, many other non-browser protocols
		if(protoi == -1)return url.href; // throw new RangeError(`Unsupported protocol '${url.protocol}'`);
		if(isNaN(port))throw new URIError(`Unknown default port for protocol: '${url.protocol}'`);

		const field = ((port << 4) + protoi).toString(16) + '/' + encodeURIComponent(url.pathname + url.search) + url.hash;
		return this.tomp.directory + service + '/' + url.host + '/' + field;
	}
	// only called in send.js get_data
	unwrap(field){
		field = String(field);
		
		const hosti = field.indexOf('/', 1);
		const host = field.slice(1, hosti);
		
		const metai = field.indexOf('/', hosti + 1);
		
		const meta = parseInt(field.slice(hosti + 1, metai), 16);

		const port = meta >> 4;
		const protocol = protocols[meta & 0xF];

		const path = decodeURIComponent(field.slice(metai + 1));
		
		return Object.setPrototypeOf({
			protocol,
			path,
			port,
			host,
		}, ParsedRewrittenURL.prototype);
	}
	get_attributes(url){
		url = String(url);
		
		const path = url.slice(this.tomp.directory.length);
		
		const si = path.indexOf('/', 1);
		
		const result = {
			service: si == -1 ? path : path.slice(0, si),
			field: si == -1 ? '/' : path.slice(si),
		};

		return result
	}
	unwrap_ez(url){
		url = String(url);
		
		// cut all characters before the prefix, get the field, unwrap
		const cut = url.slice(url.indexOf(this.tomp.directory));
		const { field } = this.get_attributes(cut);

		return this.unwrap(field).toString();
	}
};