import { program, Option } from 'commander';
import build from './cli/build.mjs';
import test from './cli/test.mjs';

program.command('build')
.addOption(new Option('-f, --folder <path>', 'folder to contain output').default('tompbuild'))
.addOption(new Option('-w, --watch', 'if the script should poll the source for changes'))
.action(build)
;

program.command('test')
.argument('<file>', 'Path to an HTML file to test')
.option('-d, --dont-unwrap', 'If the test will be unwrapped')
.action(test)
;

program.parse(process.argv);