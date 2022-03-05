// WIP
export const protocols =     ['http:','https:','blob:http:','blob:https:'];
export const default_ports = [80     ,443     ,80          ,443          ];

export class ParsedRewrittenURL {
	constructor({ protocol, host, port, path }){
		this.protocol = protocol;
		this.host = host;
		this.port = port;
		this.path = path;
	}
	get port_string(){
		if(this.protocol === 'about:'){
			return '';
		}else if(default_ports.includes(this.port)){
			return '';
		}else{
			return `:${this.port}`;
		}
	}
	get slash(){
		if(this.protocol === 'about:'){
			return '';
		}else{
			return '//';
		}
	}
	toString(){
		return `${this.protocol}${this.slash}${this.host}${this.port_string}${this.path}`;
	}
	toOrigin(){
		return `${this.protocol}${this.slash}${this.host}${this.port_string}`;
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
			host: created.hostname,
			path: created.pathname + created.search,
			port: parseInt(created.port),
			protocol: created.protocol,
		};
		
		if(isNaN(obj.port)){
			obj.port = default_ports[protocols.indexOf(obj.protocol)];
		}
		
		if(blob){
			obj.protocol = 'blob:' + obj.protocol;
		}
		
		return new ParsedRewrittenURL(obj);
	}
	wrap(url, service){
		url = String(url);
		const input_url = url;

		let hash = '';
		
		{
			const index = url.indexOf('#');
			
			if(index !== -1){
				hash = url.slice(index);
				url = url.slice(0, index);
			}
		}
		
		url = this.parse_url(url);
		
		const protoi = protocols.indexOf(url.protocol);
		
		// android-app, ios-app, mailto, many other non-browser protocols
		if(protoi === -1){
			return input_url;
		}
		
		// throw new RangeError(`Unsupported protocol '${url.protocol}'`);
		
		const field = ((url.port << 4) + protoi).toString(16) + '/' + encodeURIComponent(url.path) + hash;
		
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
		
		return new ParsedRewrittenURL({
			protocol,
			path,
			port,
			host,
		});
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

		return this.unwrap(field);
	}
};