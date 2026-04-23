import type { ColumnType, Generated, Selectable, Insertable } from 'kysely';

export interface LinksTable {
  id: Generated<number>;
  code: string;
  original_url: string;
  alias: string | null;
  expires_at: ColumnType<Date | null, string | Date | null | undefined, string | Date | null>;
  created_at: ColumnType<Date, never, never>;
  is_active: ColumnType<boolean, boolean | undefined, boolean>;
  click_count: ColumnType<number, number | undefined, number>;
}

export interface ClicksTable {
  id: Generated<number>;
  link_id: number;
  clicked_at: ColumnType<Date, never, never>;
  ip_hash: string | null;
  country: string | null;
  city: string | null;
  os: string | null;
  device: string | null;
  browser: string | null;
  referrer: string | null;
}

export interface DB {
  links: LinksTable;
  clicks: ClicksTable;
}

export type Link = Selectable<LinksTable>;
export type NewLink = Insertable<LinksTable>;

export interface AnalyticsData {
  totalClicks: number;
  uniqueVisitors: number;
  clicksByDate: { date: string; clicks: number }[];
  clicksByHour: { hour: number; clicks: number }[];
  clicksByDayOfWeek: { day: string; clicks: number }[];
  clicksByCountry: { country: string; clicks: number }[];
  clicksByCity: { city: string; clicks: number }[];
  clicksByDevice: { device: string; clicks: number }[];
  clicksByBrowser: { browser: string; clicks: number }[];
  clicksByOs: { os: string; clicks: number }[];
  clicksByReferrer: { referrer: string; clicks: number }[];
}
