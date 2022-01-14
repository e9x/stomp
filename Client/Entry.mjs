import { Client } from "./index.mjs";
import { global_client } from '../RewriteJS.mjs'

const [tompc, key] = client_information;

window[global_client] = new Client(tompc, key);