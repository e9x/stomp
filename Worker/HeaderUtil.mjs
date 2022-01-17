export function ObjectFromRawHeaders(raw){
	const result = Object.setPrototypeOf({}, null);

	for(let i = 0; i < raw.length; i += 2){
		let [header,value] = raw.slice(i, i + 2);
		if (result[header] != void[]) result[header] = [].concat(result[header], value);
		else result[header] = value;
	}

	return result;
}

export function MapHeaderNames(from, to){
	for(let header in from) {
		if(to[header.toLowerCase()] != void[]){
			const value = to[header.toLowerCase()];
			delete to[header.toLowerCase()];
			to[header] = value;
		}
	}

	return to;
};