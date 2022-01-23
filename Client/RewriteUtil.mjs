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