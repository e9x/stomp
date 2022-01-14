import { Client } from "./index.mjs";
import { global_client } from '../JSRewriter.mjs'

const [tompc, key] = client_information;

window[global_client] = new Client(tompc, key);