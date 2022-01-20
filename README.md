# TooManyProxies (Tomp)

[Demo](https://tomp.sys32.dev/)

[Frontend](https://github.com/waterswat/toomanyproxies-frontend)

## Design

[History](./History.md)

TOMP has 3 components: The server, client, and ServiceWorker (referred to as worker).

### The client's job:

Hook JavaScript functions that will create a request.

Such as `fetch(url, opts)`, `XMLHTTPRequest.prototype.open(method, url, ...etc)`.

Each request from the client will have a service: `worker:js`, `worker:html`, `worker:css`, `worker:binary`

### The server's job:

Provide an endpoint (`server:bare`) that will accept headers and a destination URL. This endpoint will return the raw binary data with no modification. The server will use minimal resources.

Currently, the server needs to serve `/prefix/worker.js`, `/prefix/client.js`, and `/prefix/bootstrapper.js`. This is due to implementation. In the future, the server will be swappable in the future and be independent of configurations.

### The worker (ServiceWorker)'s job:

Serve responses to the client. Create `server:bare` requests to the server to receive raw binary data. Depending on the service (`worker:js`, `worker:html`, `worker:css`, `worker:binary`), the data will be ran through the appropriate rewriting process then served to the client.