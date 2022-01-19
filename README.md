# TooManyProxies (Tomp)

## Design

[History](./History.md)

TOMP has 3 components: The server, client, and ServiceWorker (referred to as worker).

### The client's job:

Hook JavaScript functions that will create a request.

Such as `fetch(url, opts)`, `XMLHTTPRequest.prototype.open(method, url, ...etc)`.

Each request from the client will have a service: `server:config`, `server:static`, `js`, `html`, `css`, `binary`

### The server's job:

Provide an endpoint (`bare`) that will accept headers and a destination URL. This endpoint will return the raw binary data with no modification. The server will use minimal resources.

The server will be swappable in the future and be independent of configurations.

### The worker (ServiceWorker)'s job:

Serve responses to the client. Create `bare` requests to the server to recieve raw binary data. Depending on the service (`js`, `html`, `css`, `binary`), the data will be ran through the appropiate rewriting process and served to the client.