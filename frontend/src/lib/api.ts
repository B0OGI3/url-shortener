import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
});

export interface Link {
  id: number;
  code: string;
  original_url: string;
  alias: string | null;
  expires_at: string | null;
  created_at: string;
  is_active: boolean;
  click_count: number;
  shortUrl?: string;
}

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

export const shortenUrl = (url: string, alias?: string, expiresAt?: string) =>
  api.post<Link & { shortUrl: string }>('/api/shorten', { url, alias, expiresAt }).then(r => r.data);

export const getLinks = () =>
  api.get<Link[]>('/api/links').then(r => r.data);

export const deleteLink = (code: string) =>
  api.delete(`/api/links/${code}`);

export const getAnalytics = (code: string) =>
  api.get<AnalyticsData>(`/api/analytics/${code}`).then(r => r.data);
