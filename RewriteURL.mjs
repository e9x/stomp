// WIP
export const protocols = ['http:','https:'];

export class RewriteURL {
	constructor(tomp){
		this.tomp = tomp;
	}
	wrap(url, key){
		if(key == undefined)throw new TypeError('Bad key');

		const og = new URL(url);
		const protoi = protocols.indexOf(og.protocol);
		// android-app, ios-app, mailto, many other non-browser protocols
		if(protoi == -1)return url; // throw new RangeError(`Unsupported protocol '${og.protocol}'`);
		const field = escape(this.tomp.codec.wrap(og.host, key)) + '/' + protoi.toString(16) + escape(this.tomp.codec.wrap(og.pathname + og.search, key));
		
		return field;
	}
	unwrap(url, key){
		if(key == undefined)throw new TypeError('Bad key');

		const slash = url.indexOf('/');
		const host = this.tomp.codec.unwrap(unescape(url.slice(0, slash)), key);
		const protocol = protocols[parseInt(url[slash + 1], 16)];
		const path = this.tomp.codec.unwrap(unescape(url.slice(slash + 2)), key);
		
		// console.log(`${url} =>`, { host, protocol, path });
		return `${protocol}//${host}${path}`;
	}
};