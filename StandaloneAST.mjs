import { Command } from 'commander';
import { parseScript } from 'meriyah';
import { generate } from '@javascript-obfuscator/escodegen';

const default_port = Symbol();

const program = new Command();

let script;

program
.argument('<script>', 'JavaScript to parse')
.action(s => script = s)
.option('-g, --generate', 'If the AST should be fed into a JS generator.')
;

program.parse(process.argv);

const options = program.opts();

const tree = parseScript(script);

console.log(JSON.stringify(tree, null, '\t'));

if(options.generate){
	const generated = generate(tree);

	console.log(generated);
}