import { TOMP } from '../TOMP.mjs';
import { readFile } from 'node:fs/promises';
import { cwd } from 'node:process';
import { resolve } from 'node:path';

export default function(file, { dontUnwrap }){
	const tomp = new TOMP({
		directory: '/',
		bare: '/',
	});

	file = resolve(cwd(), file);
	console.log('Using test:', file);
	
	const base = new URL('https://www.sys32.dev/');
	
	const fg_red = `\x1b[31m`;
	const fg_green = `\x1b[32m`;
	const bright = `\x1b[1m`;
	const reset = `\x1b[0m`;
	
	function indent(text, amount, char){
		let result = text.split('\n');
	
		for(let i = 0; i < result.length; i++){
			result[i] = char.repeat(amount) + result[i];
		}
	
		return result.join('\n');
	}
	
	void async function(){
		const html = await readFile(file, 'utf-8');
		
		const rewritten = tomp.html.wrap(html, base);
		
		console.log(`${fg_red}${bright}Wrapped ${'/'.repeat(30)}:`, reset);
		console.log(`${indent(rewritten, 1, '\t')}`, reset);
		
		if(!dontUnwrap){
			const unrewritten = tomp.html.unwrap(rewritten, base);
			console.log(`${fg_green}${bright}Unwrapped ${'/'.repeat(30)}:`, reset);
			console.log(`${indent(unrewritten, 1, '\t')}`, reset);
		}
	}();
}