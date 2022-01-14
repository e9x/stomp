// Locates the global object.

var glob;

if(typeof window == 'object' && window != undefined)glob = window;
else if(typeof globalThis == 'object' && globalThis != undefined)glob = globalThis;

export const global = glob;