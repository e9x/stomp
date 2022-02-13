export async function Process(server, server_request, field){
	const url = new URL(server_request.url);
	const headers = new Headers();
	headers.set('content-type', 'text/html');
	headers.set('refresh', '0;' + server.tomp[url.searchParams.get('service')].serve(url.searchParams.get('url'), url.searchParams.get('url')));
	return new Response(undefined, { headers });
}