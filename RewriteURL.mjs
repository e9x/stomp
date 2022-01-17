import { parse } from "acorn";

// WIP
export const protocols =     ['http:','https:'];
export const default_ports = [80     ,443     ];

export class ParsedRewrittenURL {
	toString(){
		return `${this.protocol}//${this.host}${this.path}`;
	}
};

export class RewriteURL {
	constructor(tomp){
		this.tomp = tomp;
	}
	// end of host is ]/
	wrap_host(host, key){
		// host has to be in directories and reversed for cookie pathing to work
		var result = '';
		
		for(let part of host.split('.').reverse()){
			result += encodeURIComponent(this.tomp.codec.wrap(part, key)) + '/';
		}
		
		return result;
	}
	wrap_parsed(url, key, service){
		if(key == undefined)throw new TypeError('Bad key');
		const protoi = protocols.indexOf(url.protocol);
		const field = url.port.toString(16) + '/' + protoi.toString(16) + encodeURIComponent(this.tomp.codec.wrap(url.path, key));
		return this.tomp.prefix + this.wrap_host(url.host, key) + ']/' + service + '/' + field;
	}
	wrap(url, key, service){
		if(key == undefined)throw new TypeError('Bad key');

		const og = new URL(url);
		const protoi = protocols.indexOf(og.protocol);
		var port = parseInt(url.port);
		if(isNaN(port))port = default_ports[protoi];
		
		// android-app, ios-app, mailto, many other non-browser protocols
		if(protoi == -1)return url; // throw new RangeError(`Unsupported protocol '${og.protocol}'`);
		if(isNaN(port))throw new URIError(`Unknown default port for protocol: '${og.protocol}'`);

		const field = port.toString(16) + '/' + protoi.toString(16) + encodeURIComponent(this.tomp.codec.wrap(og.pathname + og.search, key)) + og.hash;
		return this.tomp.prefix + this.wrap_host(og.host, key) + ']/' + service + '/' + field;
	}
	// only called in send.js get_data
	unwrap(query, field, key/*service -keep for validation?*/){
		if(key == undefined)throw new TypeError('Bad key');

		const host = [];

		for(let part of query.slice(0,-1).split('/').reverse()){
			host.push(this.tomp.codec.unwrap(decodeURIComponent(part), key));
		}
		
		const porti = field.indexOf('/', 1);
		const port = parseInt(field.slice(1, porti), 16);
		if(porti == -1)throw new URIError('Bad URL');
		const protocol = protocols[parseInt(field[porti + 1], 16)];
		if(!protocol)throw new URIError('Bad URL');
		const path = this.tomp.codec.unwrap(decodeURIComponent(field.slice(porti + 2)), key);
		
		return Object.setPrototypeOf({
			protocol,
			path,
			port,
			host: host.join('.'),
		}, ParsedRewrittenURL.prototype);
	}
};