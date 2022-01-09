import fs from 'fs';
import path from 'path';
import webpack from "webpack";
import serveStatic from 'serve-static';
import { fileURLToPath } from 'node:url';
import { CompilationErrors, CompileCommon } from '../WebpackUtil.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const public_dir = path.resolve(__dirname, 'public');

export const Static = serveStatic(public_dir);

const frontend = webpack({
	...CompileCommon,
	entry: path.join(__dirname, '..', 'Client', 'index.mjs'),
	output: {
		path: public_dir,
		filename: 'main.js',
	},
});

frontend.watch({}, (...args) => {
	if (!CompilationErrors(...args)) console.log('Successful build of backend.');
	else console.error('Failure building backend.');
});