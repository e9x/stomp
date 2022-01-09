export const LOG_TRACE = 0;
export const LOG_DEBUG = 1;
export const LOG_INFO = 2;
export const LOG_WARN = 3;
export const LOG_ERROR = 4;
export const LOG_SILENT = 5;

// CACHE THE CONSOLE
// CONSOLE.CONTEXT ISOLATE
// FIREFOX
export class Logger {
	levels = ['trace','debug','info','warn','error','silent'];
	constructor(tomp){
		this.tomp = tomp;
	}
	trace(...args){
		if(this.tomp.loglevel <= 0)if(!this.tomp.silent)console.trace('[TOMP]', ...args);
	}
	debug(...args){
		if(this.tomp.loglevel <= 1)console.debug('[TOMP]', ...args);
	}
	info(...args){
		if(this.tomp.loglevel <= 2)console.info('[TOMP]', ...args);
	}
	warn(...args){
		if(this.tomp.loglevel <= 3)console.warn('[TOMP]', ...args);
	}
	error(...args){
		if(this.tomp.loglevel <= 4)console.error('[TOMP]', ...args);
	}
};
