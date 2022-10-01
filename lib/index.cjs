import { fileURLToPath } from 'url';

export const stompPath = fileURLToPath(new URL('../dist/', import.meta.url));
