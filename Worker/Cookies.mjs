/* refer to:
CREATE TABLE cookies(
	creation_utc INTEGER NOT NULL,
	top_frame_site_key TEXT NOT NULL,
	host_key TEXT NOT NULL,
	name TEXT NOT NULL,
	value TEXT NOT NULL,
	encrypted_value BLOB DEFAULT '',
	path TEXT NOT NULL,
	expires_utc INTEGER NOT NULL,
	is_secure INTEGER NOT NULL,
	is_httponly INTEGER NOT NULL,
	last_access_utc INTEGER NOT NULL,
	has_expires INTEGER NOT NULL DEFAULT 1,
	is_persistent INTEGER NOT NULL DEFAULT 1,
	priority INTEGER NOT NULL DEFAULT 1,
	samesite INTEGER NOT NULL DEFAULT -1,
	source_scheme INTEGER NOT NULL DEFAULT 0,
	source_port INTEGER NOT NULL DEFAULT -1,
	is_same_party INTEGER NOT NULL DEFAULT 0,
	UNIQUE (top_frame_site_key, host_key, name, path)
)
*/

export function create_db(db){
	const cookies = db.createObjectStore('cookies', {
		keyPath: 'name',
	});
	
	cookies.createIndex('name', 'name');
	cookies.createIndex('path', 'path');
	cookies.createIndex('domain', 'domain');
}

import setcookie_parser from 'set-cookie-parser';
import cookie from 'cookie';

export async function get_cookies(server, host){
	// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite

	// const parsed_cookies = cookie.parse(request_headers.get('cookie'), { decode: x => x, encode: x => x });
	const parsed_cookies = {};

	// https://developer.mozilla.org/en-US/docs/Web/API/IDBKeyRange
	const entries = await server.db.getAllFromIndex('cookies', 'domain', IDBKeyRange.upperBound('.' + host, true));
	console.log(entries);

	const new_cookies = [];
	
	for(let cname in parsed_cookies){
		const pathind = cname.lastIndexOf('/');
		if(pathind == -1)continue;
		const name = cname.slice(0, pathind);
		const path = decodeURIComponent(cname.slice(pathind + 1) || '/');
		
		if(url.path.startsWith(path)){
			new_cookies.push(cookie.serialize(name, parsed_cookies[cname], { decode: x => x, encode: x => x }));
		}
	}
	
	return new_cookies.join('; ');
}

const samesites = ['lax','strict','none'];

export async function load_setcookies(server, host, setcookie){
	for(let set of [].concat(setcookie)){
		const parsed = setcookie_parser(setcookie, {
			decodeValues: false,
			silent: true,
		});

		for(let cookie of parsed){
			// if(!cookie.domain.endsWith(host)){...}
			if(!cookie.domain)cookie.domain = host;
			if(!cookie.path)cookie.path = '/';
			if(!cookie.httpOnly)cookie.httpOnly = false;
			if(!samesites.includes(cookie.sameSite?.toLowerCase()))cookie.sameSite = 'none';
			if(!cookie.secure)cookie.secure = false;
			console.log(cookie, 'put');
			server.db.put('cookies', cookie);
		}
	}
	
}