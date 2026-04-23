import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { runMigrations } from './db/index.js';
import { linksRoutes } from './routes/links.js';

const fastify = Fastify({ logger: true, trustProxy: true });

await fastify.register(cors, { origin: true });
await fastify.register(linksRoutes);

fastify.get('/health', async () => ({ status: 'ok' }));

await runMigrations();
await fastify.listen({ port: Number(process.env.PORT ?? 3001), host: '0.0.0.0' });
