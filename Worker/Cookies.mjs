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
	
	cookies.createIndex('domain', 'domain');
}

import setcookie_parser from 'set-cookie-parser';
import cookie from 'cookie';

export async function get_cookies(server, path, host){
	// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite
	// https://developer.mozilla.org/en-US/docs/Web/API/IDBKeyRange
	
	const entries = await server.db.getAllFromIndex('cookies', 'domain', IDBKeyRange.upperBound('.' + host, true));
	
	console.log(entries, host);

	const new_cookies = [];
	
	for(let cookie of entries){
		if(path.startsWith(cookie.path)){
			new_cookies.push(`${cookie.name}=${cookie.value}`);
		}
	}
	
	return new_cookies.join('; ');
}

const samesites = ['lax','strict','none'];

function normalize_cookie(cookie){
	if(!cookie.domain)cookie.domain = host;
	if(!cookie.path)cookie.path = '/';
	// todo: truncate cookie path at last /
	if(!cookie.httpOnly)cookie.httpOnly = false;
	if(!samesites.includes(cookie.sameSite?.toLowerCase()))cookie.sameSite = 'none';
	if(!cookie.secure)cookie.secure = false;
}

export async function load_setcookies(server, host, setcookie){
	for(let set of [].concat(setcookie)){
		const parsed = setcookie_parser(setcookie, {
			decodeValues: false,
			silent: true,
		});

		const tx = server.db.transaction('cookies', 'readwrite');

		for await (const cursor of tx.store) {
			for(let cookie of parsed){
				normalize_cookie(cookie);
				// if(!cookie.domain.endsWith(host)){...}
				
				if(cursor.value.name == cookie.name && cursor.value.path == cookie.path && cursor.value.domain == cookie.domain){
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