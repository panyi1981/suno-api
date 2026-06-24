import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'src/app/docs/swagger-suno-api.json');
const target = join(root, 'public/swagger-suno-api.json');

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);

console.log(`Synced OpenAPI spec → public/swagger-suno-api.json`);
