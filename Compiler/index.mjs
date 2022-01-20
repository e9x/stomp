import fs from 'fs';
import path from 'path';
import webpack from 'webpack';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PublicDir = path.resolve(__dirname, 'public');

function compilation_errors(error, stats = { compilation: { errors: [] } }){
	var had_error = false;
	
	if(error){
		had_error = true;
		console.error(error);
	}
	
	for(let error of stats.compilation.errors){
		console.error(error);
	}
	
	return had_error;
}

const client = webpack({
	mode: 'development',
	devtool: 'source-map',
	entry: path.join(__dirname, '..', 'Client', 'Entry.mjs'),
	context: __dirname,
	output: {
		path: PublicDir,
		filename: 'client.js',
	},
});

client.watch({}, (...args) => {
	if (!compilation_errors(...args)) console.log('Successful build of client.');
	else console.error('Failure building client.');
});

const worker = webpack({
	mode: 'development',
	devtool: 'source-map',
	entry: path.join(__dirname, '..', 'Worker', 'Entry.mjs'),
	context: __dirname,
	output: {
		path: PublicDir,
		filename: 'worker.js',
	},
});

worker.watch({}, (...args) => {
	if (!compilation_errors(...args)) console.log('Successful build of worker.');
	else console.error('Failure building worker.');
});

const bootstrapper = webpack({
	mode: 'development',
	devtool: 'source-map',
	entry: path.join(__dirname, '..', 'Bootstrapper.mjs'),
	context: __dirname,
	output: {
		path: PublicDir,
		filename: 'bootstrapper.js',
	},
});

bootstrapper.watch({}, (...args) => {
	if (!compilation_errors(...args)) console.log('Successful build of bootstrapper.');
	else console.error('Failure building bootstrapper.');
});