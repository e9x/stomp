# History

## Emscripten

TOMP was originally going to be written in C++, using emscripten for the client script.

Due to the lack of advanced HTTP libraries, the idea of being written in C++ was abandoned.

NodeJS is tried and true, especially when writing proxies.

## Only 2 modules

Prior to the idea of moving all the load from the server onto a ServiceWorker, TOMP was going to be a plain client and server proxy.

Only 2 days prior to writing this (1/18/2022), TOMP had no business with ServiceWorkers. The goal was to perfect current proxies such as [Corrosion](https://github.com/titaniumnetwork-dev/corrosion), [Alloy](https://github.com/titaniumnetwork-dev/alloy), and [SystemYA proxy](https://github.com/sysce/proxy).