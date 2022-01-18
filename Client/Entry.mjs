import { Client } from "./Client.mjs";
import { global_client } from '../RewriteJS.mjs'

window[global_client] = Client;