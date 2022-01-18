export async function Process(server, request, response){
	const url = new URL(request.url);
	const search = new URLSearchParams(url.search);
	const dest = search.get('dest');
	const headers = new Headers();
	headers.set('content-type', 'text/html');
	headers.set('refresh', '0;' + server.tomp.html.serve(dest, dest, server.key));
	return new Response(new Uint8Array(), { headers, status: 200 });
}