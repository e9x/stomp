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
		autoIncrement: true,
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
	// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite
	// https://developer.mozilla.org/en-US/docs/Web/API/IDBKeyRange
	
	const entries = await server.db.getAllFromIndex('cookies', 'path', idb_range_startswith(get_directory(url.path)));
	
	const new_cookies = [];
	
	for(let cookie of entries){
		if(('.' + url.host).endsWith(cookie.domain)){
			new_cookies.push(`${cookie.name}=${cookie.value}`);
		}
	}
	
	return new_cookies.join('; ');
}

const samesites = ['lax','strict','none'];

function normalize_cookie(cookie, host){
	if(!cookie.domain)cookie.domain = host;
	if(!cookie.path)cookie.path = '/'
	// todo: truncate cookie path at last /
	if(!cookie.httpOnly)cookie.httpOnly = false;
	if(!samesites.includes(cookie.sameSite?.toLowerCase()))cookie.sameSite = 'none';
	if(!cookie.secure)cookie.secure = false;
}

export async function load_setcookies(server, url, setcookie){
	for(let set of [].concat(setcookie)){
		const parsed = setcookie_parser(setcookie, {
			decodeValues: false,
			silent: true,
		});

		const index = server.db.transaction('cookies', 'readwrite').store.index('path');
		
		for(let cookie of parsed){
			normalize_cookie(cookie, url.host);
		}

		for await (const cursor of index.iterate(idb_range_startswith(get_directory(url.path)))) {
			for(let cookie of parsed){
				if(cursor.value.name == cookie.name && cursor.value.domain == cookie.domain){
					let found_id = cursor.value.id;

					if(!cookie.value){
						cursor.delete();
						// server.db.delete(found_id)
					}else{
						server.db.put('cookies', {
							id: found_id,
							...cookie,
						});
					}

					cookie.processed = true;
				}
			}
		}
		
		for(let cookie of parsed){
			if(!cookie.processed && cookie.value){
				await server.db.add('cookies', cookie);
			}
		}
		
	}
	
}