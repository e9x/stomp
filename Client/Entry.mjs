import { Client } from "./index.mjs";
import { global_client } from '../RewriteJS.mjs'

window[global_client] = function(tompc, key){
	window[global_client] = new Client(tompc, key);
}