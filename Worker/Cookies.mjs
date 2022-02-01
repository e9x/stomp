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
		keyPath: 'id',
	});
	
	cookies.createIndex('path', 'path');
}

import setcookie_parser from 'set-cookie-parser';

function get_directory(path){
	let pathname = path;
	
	const searchi = pathname.indexOf('?');
	
	if(searchi != -1){
		pathname = pathname.slice(0, searchi);
	}

	const hashi = pathname.indexOf('#');

	if(hashi != -1){
		pathname = pathname.slice(0, hashi);
	}

	return pathname.slice(0, pathname.lastIndexOf('/')) + '/';
}

function increase_lastchr(str){
	return str.substring(0, str.length-1) + String.fromCharCode(str.charCodeAt(str.length-1)+1);
}

function idb_range_startswith(str){
	return IDBKeyRange.bound(str, increase_lastchr(str), false, true);
}

export async function get_cookies(server, url){
	const now = new Date();

	// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite
	// https://developer.mozilla.org/en-US/docs/Web/API/IDBKeyRange
	
	await server.ready;
	
	const entries = await server.db.getAllFromIndex('cookies', 'path', idb_range_startswith(get_directory(url.path)));
	
	const new_cookies = [];
	
	for(let cookie of entries){
		let expires = new Date(0);
		
		if('maxAge' in cookie){
			expires = set.getTime() + cookie.maxAge;
		}else if('expires' in cookie){
			expires = cookie.expires;
		}
		
		if(expires < now){
			server.db.delete('cookies', cookie.id);
		}

		if(('.' + url.host).endsWith(cookie.domain)){
			new_cookies.push(`${cookie.name}=${cookie.value}`);
		}
	}
	
	// server.tomp.log.debug('Send cookies:', new_cookies);

	return new_cookies.join('; ');
}

const samesites = ['lax','strict','none'];
const cookie_keys = ['domain','path','httpOnly','sameSite','secure','expires','maxAge','name','value'];

function normalize_cookie(cookie, host){
	const result = {};

	for(let key of cookie_keys){
		if(key in cookie){
			result[key] = cookie[key];
		}
	}

	if(!result.domain){
		result.domain = host;
	}

	// todo: truncate cookie path at last /
	if(!result.path){
		result.path = '/'
	}

	if(!result.httpOnly){
		result.httpOnly = false;
	}

	if(!samesites.includes(result.sameSite?.toLowerCase())){
		result.sameSite = 'none';
	}

	if(!result.secure){
		result.secure = false;
	}

	return result;
}

export async function load_setcookies(server, url, setcookie){
	for(let set of [].concat(setcookie)){
		const parsed = setcookie_parser(setcookie, {
			decodeValues: false,
			silent: true,
		});
		
		await server.ready;
		
		const index = server.db.transaction('cookies', 'readwrite').store.index('path');
		
		for(let cookie of parsed){
			cookie = normalize_cookie(cookie, url.host);

			const id = cookie.domain + '@' + cookie.path + '@' + cookie.name;
			
			if(!cookie.value){
				server.db.delete('cookies', id);
			}else{
				server.db.put('cookies', {
					...cookie,
					id,
					set: new Date(Date.now()),
				});
			}
		}
	}
}