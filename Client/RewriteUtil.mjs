export const function_strings = new Map();

export function mirror_attributes(from, to){
	function_strings.set(to, from.toString());
	Object.defineProperty(to, 'length', Object.getOwnPropertyDescriptor(from, 'length'));
	Object.defineProperty(to, 'name', Object.getOwnPropertyDescriptor(from, 'name'));
	return to;
};

export function wrap_function(fn, wrap, construct){
	const wrapped = 'prototype' in fn ? function attach(...args) {
		return wrap(fn, this, args);
	} : {
		attach(...args) {
			return wrap(fn, this, args);
		},
	}['attach'];
	
	mirror_attributes(fn, wrapped);
	
	if (!!construct) {
		wrapped.prototype = fn.prototype;
		wrapped.prototype.constructor = wrapped; 
	};

	return wrapped
};
		
Function.prototype.toString = wrap_function(Function.prototype.toString, (target, that, args) => {
	if(function_strings.has(that))return function_strings.get(that);
	else return Reflect.apply(target, that, args);
});

export const native_proxies = new WeakMap();

export function resolve_native(proxy/*?*/){
	if(native_proxies.has(proxy))return native_proxies.get(proxy);
	else return proxy;
}

export function bind_natives(target){
	for(let prop in target){
		const desc = Object.getOwnPropertyDescriptor(target, prop);

		if(!desc || !desc.configurable)continue;

		let changed = false;

		if(typeof desc.value == 'function'){
			desc.value = wrap_function(desc.value, (target, that, args) => {
				return Reflect.apply(target, resolve_native(that), args);
			});

			changed = true;
		}

		if(typeof desc.get == 'function'){
			desc.get = wrap_function(desc.get, (target, that, args) => {
				return Reflect.apply(target, resolve_native(that), args);
			});

			changed = true;
		}
		if(typeof desc.set == 'function'){
			desc.set = wrap_function(desc.set, (target, that, args) => {
				return Reflect.apply(target, resolve_native(that), args);
			});

			changed = true;
		}

		if(changed){
			Object.defineProperty(target, prop, desc);
		}
	}
}