import 'dotenv/config';
import { runMigrations } from './index.js';

await runMigrations();
console.log('Migrations complete');
process.exit(0);
