export async function Process(server, request, field){
	const dest = decodeURIComponent(field.slice(1));
	const headers = new Headers();
	headers.set('content-type', 'text/html');
	headers.set('refresh', '0;' + server.tomp.html.serve(dest, dest));
	return new Response(new Uint8Array(), { headers, status: 200 });
}