// WIP
export const protocols = ['http:','https:'];

export class RewriteURL {
	constructor(tomp){
		this.tomp = tomp;
	}
	wrap_host(host, key){
		const reversed_host = [...host].reverse().join('') + '.';
		// host has to be reversed for cookie pathing to work
		return escape(this.tomp.codec.wrap(reversed_host, key)) + '/';
	}
	wrap(url, key, service){
		if(key == undefined)throw new TypeError('Bad key');

		const og = new URL(url);
		const protoi = protocols.indexOf(og.protocol);
		
		// android-app, ios-app, mailto, many other non-browser protocols
		if(protoi == -1)return url; // throw new RangeError(`Unsupported protocol '${og.protocol}'`);
		
		const field = this.tomp.prefix + this.wrap_host(og.host, key) + service + '/' + protoi.toString(16) + escape(this.tomp.codec.wrap(og.pathname + og.search, key)) + og.hash;
		return field;
	}
	// only called in send.js get_data
	unwrap(query, field, key/*service -keep for validation?*/){
		if(key == undefined)throw new TypeError('Bad key');

		const host = [...this.tomp.codec.unwrap(unescape(query), key)].reverse().join('').slice(1);
		const protocol = protocols[parseInt(field[1], 16)];
		const path = this.tomp.codec.unwrap(unescape(field.slice(2)), key);
		
		// this.tomp.log.debug(`=>`, { protocol, host, path });
		return `${protocol}//${host}${path}`;
	}
};