export const function_strings = new Map();

export function mirror_attributes(from, to){
	function_strings.set(to, from.toString());
	Object.defineProperty(to, 'length', Object.getOwnPropertyDescriptor(from, 'length'));
	Object.defineProperty(to, 'name', Object.getOwnPropertyDescriptor(from, 'name'));
	return to;
};

export function wrap_function(obj, prop, wrap, construct) {
	const fn = obj[prop];
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