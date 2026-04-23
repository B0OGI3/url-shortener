import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import * as linksService from '../services/links.js';

const ShortenBody = z.object({
  url: z.string().url(),
  alias: z.string().min(1).max(50).optional(),
  expiresAt: z.string().datetime().optional(),
});

export const linksRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/api/shorten', async (request, reply) => {
    const parsed = ShortenBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { url, alias, expiresAt } = parsed.data;
    try {
      const link = await linksService.createLink(url, alias, expiresAt);
      return reply.code(201).send({
        ...link,
        shortUrl: `${process.env.BASE_URL}/${link.code}`,
      });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === '23505') {
        return reply.code(409).send({ error: 'Alias already in use' });
      }
      throw err;
    }
  });

  fastify.get<{ Params: { code: string } }>('/:code', async (request, reply) => {
    const { code } = request.params;
    const link = await linksService.resolveLink(code);
    if (!link) return reply.code(404).send({ error: 'Link not found or expired' });

    linksService
      .logClick(link.id, request.ip, request.headers['user-agent'], request.headers['referer'])
      .catch(() => {});

    return reply.redirect(link.original_url, 302);
  });

  fastify.get('/api/links', async () => linksService.listLinks());

  fastify.get<{ Params: { code: string } }>('/api/analytics/:code', async (request, reply) => {
    const data = await linksService.getAnalytics(request.params.code);
    if (!data) return reply.code(404).send({ error: 'Link not found' });
    return data;
  });

  fastify.delete<{ Params: { code: string } }>('/api/links/:code', async (request, reply) => {
    const ok = await linksService.deactivateLink(request.params.code);
    if (!ok) return reply.code(404).send({ error: 'Link not found' });
    return reply.code(204).send();
  });
};
