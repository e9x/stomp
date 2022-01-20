export const LOG_TRACE = 0;
export const LOG_DEBUG = 1;
export const LOG_INFO = 2;
export const LOG_WARN = 3;
export const LOG_ERROR = 4;
export const LOG_SILENT = 5;

const trace = console.trace.bind(console);
const debug = console.debug.bind(console);
const info = console.info.bind(console);
const warn = console.warn.bind(console);
const error = console.error.bind(console);

export class Logger {
	levels = ['trace','debug','info','warn','error','silent'];
	constructor(tomp){
		this.tomp = tomp;
	}
	trace(...args){
		if(this.tomp.loglevel <= LOG_TRACE)if(!this.tomp.silent)trace('[TOMP]', ...args);
	}
	debug(...args){
		if(this.tomp.loglevel <= LOG_DEBUG)debug('[TOMP]', ...args);
	}
	info(...args){
		if(this.tomp.loglevel <= LOG_INFO)info('[TOMP]', ...args);
	}
	warn(...args){
		if(this.tomp.loglevel <= LOG_WARN)warn('[TOMP]', ...args);
	}
	error(...args){
		if(this.tomp.loglevel <= LOG_ERROR)error('[TOMP]', ...args);
	}
};
