import { TompURI } from './TompURI.mjs';

// WIP
export const protocols = ['http:','https:'];

export class RewriteURL {
	constructor(tomp){
		this.tomp = tomp;
	}
	// end of host is ]/
	wrap_host(host, key){
		// host has to be in directories and reversed for cookie pathing to work
		var result = '';
		
		for(let part of host.split('.').reverse()){
			result += TompURI.encode(this.tomp.codec.wrap(part, key)) + '/';
		}
		
		return result;
	}
	wrap(url, key, service){
		if(key == undefined)throw new TypeError('Bad key');

		const og = new URL(url);
		const protoi = protocols.indexOf(og.protocol);
		
		// android-app, ios-app, mailto, many other non-browser protocols
		if(protoi == -1)return url; // throw new RangeError(`Unsupported protocol '${og.protocol}'`);
		
		const field = protoi.toString(16) + TompURI.encode(this.tomp.codec.wrap(og.pathname + og.search, key)) + og.hash;
		return this.tomp.prefix + this.wrap_host(og.host, key) + ']/' + service + '/' + field;
	}
	// only called in send.js get_data
	unwrap(query, field, key/*service -keep for validation?*/){
		if(key == undefined)throw new TypeError('Bad key');

		const host = [];

		for(let part of query.slice(0,-1).split('/').reverse()){
			host.push(this.tomp.codec.unwrap(TompURI.decode(part), key));
		}
		
		const protocol = protocols[parseInt(field[1], 16)];
		const path = this.tomp.codec.unwrap(TompURI.decode(field.slice(2)), key);
		
		// this.tomp.log.debug(`=>`, { protocol, host, path });
		return `${protocol}//${host.join('.')}${path}`;
	}
};