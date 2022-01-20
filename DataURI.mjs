const protocol = 'data:';

export function ParseDataURI(href){
	if(href instanceof URL)href = href.href;
	else if(typeof href != 'string')throw new TypeError('Bad data URI type.');
	if(!href.startsWith(protocol))throw new Error('Not a data: URI');

	href = href.slice(protocol.length);

	const datapos = href.indexOf(',');
	if(datapos == -1)throw new URIError('Invalid data: URI');

	const split = `${href.slice(0, datapos)}`.split(';');
	var mime = split.splice(0, 1);
	if(mime == undefined)throw new URIError('Invalid data: URI');
	var base64 = false;

	for(let part of split){
		if(part.startsWith('charset='))mime += ';' + part;
		else if(part == 'base64')base64 = true;
	}
	
	let data = decodeURIComponent(href.slice(datapos + 1));
	
	if(base64)data = atob(data);
	
	return {
		mime,
		data,
	};
}

/*console.log(ParseDataURI(`data:text/vnd-example+xyz;foo=bar;base64,R0lGODdh`));
console.log(ParseDataURI(`data:text/plain;charset=UTF-8;page=21,the%20data:1234,5678`));
console.log(ParseDataURI(`data:text/html;charset=utf-8,%3C!DOCTYPE%20html%3E%3Chtml%20lang%3D%22en%22%3E%3Chead%3E%3Ctitle%3EEmbedded%20Window%3C%2Ftitle%3E%3C%2Fhead%3E%3Cbody%3E%3Ch1%3E42%3C%2Fh1%3E%3C%2Fbody%3E%3C%2Fhtml%3E`));
console.log(ParseDataURI(`data:,test`));*/