import { program, Option, Argument } from 'commander';
import build from './cli/build.js';
import test from './cli/test.js';
import ast from './cli/ast.js';

program.command('build')
.argument('<output>', 'Output scripts folder', undefined, 'tompbuild')
.addOption(new Option('-w, --watch', 'if the script should poll the source for changes'))
.addOption(new Option('--development', 'Verbose scripts, skip minification'))
.action(build)
;

program.command('test')
.argument('<file>', 'Path to an HTML file to test')
.option('-d, --dont-unwrap', 'If the test will be unwrapped')
.action(test)
;

program.command('ast')
.addArgument(new Argument('<file>', 'JavaScript file to parse').argOptional())
.option('-c, --code <code>', 'Code to parse')
.option('-g, --generate', 'If the AST should be fed into a JS generator.')
.action(ast)
;

program.parse(process.argv);