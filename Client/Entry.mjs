import { Client } from "./index.mjs";
import { global_client } from '../RewriteJS.mjs'

window[global_client] = Client;