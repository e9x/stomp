import { parseScript } from 'meriyah-loose';
import { generate as generateScript } from '@javascript-obfuscator/escodegen';
import { readFile } from 'node:fs/promises';

export default async function ast(file, { code, generate }){
	if(!code){
		if(file){
			code = await readFile(file, 'utf-8');
		}else{
			throw new Error('Code or file must be specified. Both cannot be empty.')
		}
	}

	console.log(code);

	const tree = parseScript(code);
	
	console.log(JSON.stringify(tree, null, '\t'));
	
	if(generate){
		const generated = generateScript(tree);
	
		console.log(generated);
	}
}
