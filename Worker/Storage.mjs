import { ParsedRewrittenURL } from '../RewriteURL.js';

export function create_db(db){
	const localStorage = db.createObjectStore('localStorage', {
		keyPath: 'id',
	});
	
	localStorage.createIndex('origin', 'origin');
	localStorage.createIndex('id', 'id');

	const sessionStorage = db.createObjectStore('sessionStorage', {
		keyPath: 'id',
	});
	
	sessionStorage.createIndex('origin', 'origin');
	sessionStorage.createIndex('id', 'id');
}

function get_id(name, remote){
	return `${remote.toOrigin()}/${name}`;
}

function get_db_name(session){
	return session ? 'sessionStorage' : 'localStorage';
}

export async function getItem(server, session, name, remote){
	remote = new ParsedRewrittenURL(remote);
	const data = await server.db.getFromIndex(get_db_name(session), 'id', get_id(name, remote));
	
	if(data){
		return data.value;
	}else{
		return undefined;
	}
}

export async function setItem(server, session, name, value, remote){
	remote = new ParsedRewrittenURL(remote);
	await server.db.put(get_db_name(session), {
		name,
		value,
		origin: remote.toOrigin(),
		id: get_id(name, remote),
	});
}

export async function removeItem(server, session, name, remote){
	remote = new ParsedRewrittenURL(remote);
	await server.db.delete(get_db_name(session), get_id(name, remote));
}

export async function hasItem(server, session, name, remote){
	remote = new ParsedRewrittenURL(remote);
	const data = await server.db.getFromIndex(get_db_name(session), 'id', get_id(name, remote));
	return data !== undefined;
}

export async function getKeys(server, session, remote){
	remote = new ParsedRewrittenURL(remote);
	const tx = server.db.transaction(get_db_name(session));
	const index = tx.store.index('origin');
	const all = await index.getAll(IDBKeyRange.only(remote.toOrigin()));
	const result = [];

	for(let { name } of all){
		result.push(name);
	}

	return result;
}

export async function clear(server, session, remote){
	remote = new ParsedRewrittenURL(remote);
	const tx = server.db.transaction(get_db_name(session));
	const index = tx.store.index('origin');

	for await(const cursor of index.iterate(IDBKeyRange.only(remote.toOrigin()))){
		cursor.delete();
	}
}

export async function length(server, session, remote){
	remote = new ParsedRewrittenURL(remote);
	return (await getKeys(server, session, remote)).length;
}

export async function key(server, session, index, remote){
	remote = new ParsedRewrittenURL(remote);
	return (await getKeys(server, session, remote))[index];
}