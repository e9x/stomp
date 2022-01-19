import fs from 'fs';
import path from 'path';
import webpack from "webpack";
import { fileURLToPath } from 'node:url';
import { CompilationErrors, CompileCommon } from '../WebpackUtil.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PublicDir = path.resolve(__dirname, 'public');

const client = webpack({
	...CompileCommon,
	entry: path.join(__dirname, '..', 'Client', 'Entry.mjs'),
	context: __dirname,
	output: {
		path: PublicDir,
		filename: 'client.js',
	},
	plugins: [
		new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
        }),
	],
});

client.watch({}, (...args) => {
	if (!CompilationErrors(...args)) console.log('Successful build of client.');
	else console.error('Failure building client.');
});

const worker = webpack({
	...CompileCommon,
	entry: path.join(__dirname, '..', 'Worker', 'Entry.mjs'),
	context: __dirname,
	output: {
		path: PublicDir,
		filename: 'worker.js',
	},
	plugins: [
		new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
        }),
	],
});

worker.watch({}, (...args) => {
	if (!CompilationErrors(...args)) console.log('Successful build of worker.');
	else console.error('Failure building worker.');
});

const bootstrapper = webpack({
	...CompileCommon,
	entry: path.join(__dirname, '..', 'Bootstrap.mjs'),
	context: __dirname,
	output: {
		path: PublicDir,
		filename: 'bootstrap.js',
	},
});

bootstrapper.watch({}, (...args) => {
	if (!CompilationErrors(...args)) console.log('Successful build of bootstrapper.');
	else console.error('Failure building bootstrapper.');
});