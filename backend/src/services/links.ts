import { createHash } from 'crypto';
import { nanoid } from 'nanoid';
import { sql } from 'kysely';
import { db } from '../db/index.js';
import { cacheGet, cacheSet, cacheDel } from '../cache/index.js';
import type { Link, AnalyticsData } from '../types/index.js';

const CODE_LENGTH = Number(process.env.CODE_LENGTH ?? 7);

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export async function createLink(
  originalUrl: string,
  alias?: string,
  expiresAt?: string,
): Promise<Link> {
  const code = alias ?? nanoid(CODE_LENGTH);

  return db
    .insertInto('links')
    .values({
      code,
      original_url: originalUrl,
      alias: alias ?? null,
      expires_at: expiresAt ?? null,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function resolveLink(code: string): Promise<Link | null> {
  const cached = await cacheGet(`link:${code}`);
  if (cached) {
    const link = JSON.parse(cached) as Link;
    if (link.expires_at && new Date(link.expires_at) < new Date()) return null;
    return link;
  }

  const link = await db
    .selectFrom('links')
    .selectAll()
    .where('code', '=', code)
    .where('is_active', '=', true)
    .executeTakeFirst();

  if (!link) return null;
  if (link.expires_at && new Date(link.expires_at) < new Date()) return null;

  await cacheSet(`link:${code}`, JSON.stringify(link));
  return link;
}

export async function logClick(
  linkId: number,
  ip: string | undefined,
  userAgent: string | undefined,
  referrer: string | undefined,
): Promise<void> {
  const ipHash = ip ? createHash('sha256').update(ip).digest('hex') : null;

  let country: string | null = null;
  let city: string | null = null;

  if (ip && ip !== '::1' && !ip.startsWith('127.')) {
    try {
      const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,city`);
      const data = await res.json() as { country?: string; city?: string };
      country = data.country ?? null;
      city = data.city ?? null;
    } catch {
      // geo lookup is best-effort
    }
  }

  const ua = userAgent ?? '';
  const device = /mobile/i.test(ua) ? 'mobile' : /tablet/i.test(ua) ? 'tablet' : 'desktop';
  const browser =
    /edg/i.test(ua) ? 'Edge' :
    /chrome/i.test(ua) ? 'Chrome' :
    /firefox/i.test(ua) ? 'Firefox' :
    /safari/i.test(ua) ? 'Safari' : 'Other';
  const os =
    /windows/i.test(ua) ? 'Windows' :
    /iphone/i.test(ua) ? 'iOS' :
    /ipad/i.test(ua) ? 'iPadOS' :
    /android/i.test(ua) ? 'Android' :
    /mac os x/i.test(ua) ? 'macOS' :
    /linux/i.test(ua) ? 'Linux' : 'Other';

  await Promise.all([
    db.insertInto('clicks').values({
      link_id: linkId,
      ip_hash: ipHash,
      country,
      city,
      os,
      device,
      browser,
      referrer: referrer ?? null,
    }).execute(),
    db.updateTable('links')
      .set(eb => ({ click_count: eb('click_count', '+', 1) }))
      .where('id', '=', linkId)
      .execute(),
  ]);
}

export async function listLinks(): Promise<Link[]> {
  return db
    .selectFrom('links')
    .selectAll()
    .where('is_active', '=', true)
    .orderBy('created_at', 'desc')
    .execute();
}

export async function deactivateLink(code: string): Promise<boolean> {
  const result = await db
    .updateTable('links')
    .set({ is_active: false })
    .where('code', '=', code)
    .where('is_active', '=', true)
    .returningAll()
    .executeTakeFirst();

  if (result) await cacheDel(`link:${code}`);
  return !!result;
}

export async function getAnalytics(code: string): Promise<AnalyticsData | null> {
  const link = await db
    .selectFrom('links')
    .select(['id', 'click_count'])
    .where('code', '=', code)
    .executeTakeFirst();

  if (!link) return null;

  const [
    byDate, byHour, byDow,
    byCountry, byCity,
    byDevice, byBrowser, byOs,
    byReferrer, uniqueResult,
  ] = await Promise.all([
    db.selectFrom('clicks')
      .select(eb => [
        sql<string>`DATE(clicked_at)`.as('date'),
        eb.fn.count<string>('id').as('clicks'),
      ])
      .where('link_id', '=', link.id)
      .groupBy(sql`DATE(clicked_at)`)
      .orderBy(sql`DATE(clicked_at)`)
      .execute(),

    db.selectFrom('clicks')
      .select(eb => [
        sql<number>`EXTRACT(HOUR FROM clicked_at)`.as('hour'),
        eb.fn.count<string>('id').as('clicks'),
      ])
      .where('link_id', '=', link.id)
      .groupBy(sql`EXTRACT(HOUR FROM clicked_at)`)
      .orderBy(sql`EXTRACT(HOUR FROM clicked_at)`)
      .execute(),

    db.selectFrom('clicks')
      .select(eb => [
        sql<number>`EXTRACT(DOW FROM clicked_at)`.as('dow'),
        eb.fn.count<string>('id').as('clicks'),
      ])
      .where('link_id', '=', link.id)
      .groupBy(sql`EXTRACT(DOW FROM clicked_at)`)
      .orderBy(sql`EXTRACT(DOW FROM clicked_at)`)
      .execute(),

    db.selectFrom('clicks')
      .select(eb => ['country', eb.fn.count<string>('id').as('clicks')] as const)
      .where('link_id', '=', link.id)
      .where('country', 'is not', null)
      .groupBy('country')
      .orderBy('clicks', 'desc')
      .execute(),

    db.selectFrom('clicks')
      .select(eb => ['city', eb.fn.count<string>('id').as('clicks')] as const)
      .where('link_id', '=', link.id)
      .where('city', 'is not', null)
      .groupBy('city')
      .orderBy('clicks', 'desc')
      .limit(10)
      .execute(),

    db.selectFrom('clicks')
      .select(eb => ['device', eb.fn.count<string>('id').as('clicks')] as const)
      .where('link_id', '=', link.id)
      .where('device', 'is not', null)
      .groupBy('device')
      .execute(),

    db.selectFrom('clicks')
      .select(eb => ['browser', eb.fn.count<string>('id').as('clicks')] as const)
      .where('link_id', '=', link.id)
      .where('browser', 'is not', null)
      .groupBy('browser')
      .execute(),

    db.selectFrom('clicks')
      .select(eb => ['os', eb.fn.count<string>('id').as('clicks')] as const)
      .where('link_id', '=', link.id)
      .where('os', 'is not', null)
      .groupBy('os')
      .execute(),

    db.selectFrom('clicks')
      .select(eb => ['referrer', eb.fn.count<string>('id').as('clicks')] as const)
      .where('link_id', '=', link.id)
      .where('referrer', 'is not', null)
      .groupBy('referrer')
      .orderBy('clicks', 'desc')
      .limit(10)
      .execute(),

    db.selectFrom('clicks')
      .select(sql<string>`COUNT(DISTINCT ip_hash)`.as('count'))
      .where('link_id', '=', link.id)
      .where('ip_hash', 'is not', null)
      .executeTakeFirst(),
  ]);

  // Fill all 24 hours so the chart never has gaps
  const hourMap = new Map(byHour.map(r => [Number(r.hour), Number(r.clicks)]));
  const clicksByHour = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    clicks: hourMap.get(h) ?? 0,
  }));

  // Fill all 7 days so the chart never has gaps
  const dowMap = new Map(byDow.map(r => [Number(r.dow), Number(r.clicks)]));
  const clicksByDayOfWeek = Array.from({ length: 7 }, (_, d) => ({
    day: DOW_LABELS[d],
    clicks: dowMap.get(d) ?? 0,
  }));

  return {
    totalClicks: link.click_count,
    uniqueVisitors: Number(uniqueResult?.count ?? 0),
    clicksByDate: byDate.map(r => ({ date: r.date, clicks: Number(r.clicks) })),
    clicksByHour,
    clicksByDayOfWeek,
    clicksByCountry: byCountry.map(r => ({ country: r.country!, clicks: Number(r.clicks) })),
    clicksByCity: byCity.map(r => ({ city: r.city!, clicks: Number(r.clicks) })),
    clicksByDevice: byDevice.map(r => ({ device: r.device!, clicks: Number(r.clicks) })),
    clicksByBrowser: byBrowser.map(r => ({ browser: r.browser!, clicks: Number(r.clicks) })),
    clicksByOs: byOs.map(r => ({ os: r.os!, clicks: Number(r.clicks) })),
    clicksByReferrer: byReferrer.map(r => ({ referrer: r.referrer!, clicks: Number(r.clicks) })),
  };
}
