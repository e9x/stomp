import { Builder } from './Builder.mjs';
import { program, Option } from 'commander';
import { resolve } from 'node:path';

const default_port = Symbol();

program
.addOption(new Option('-f, --folder <path>', 'folder to contain output').default('tompbuild'))
.addOption(new Option('-w, --watch', 'if the script should poll the source for changes'))
;

program.parse(process.argv);

const options = program.opts();

const folder = resolve(process.cwd(), options.folder);

const builder = new Builder(folder);
console.info('Created builder on folder:', folder);

if(options.watch){
	const emitter = builder.watch();

	emitter.on('error', errors => {
		for(let error of errors){
			console.error(error);
		}

		console.error('Failure building');
	});

	emitter.on('bulit', () => {
		console.log('Successfully built');
	});
}else{
	try{
		await builder.build();
		console.log('Success');
	}catch(err){
		for(let error of [].concat(err)){
			console.error(error);	
		}

		console.error('Failure');
	}
}