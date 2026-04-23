import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getLinks, shortenUrl, deleteLink } from '../lib/api';
import type { Link as LinkType } from '../lib/api';

export default function Dashboard() {
  const [links, setLinks] = useState<LinkType[]>([]);
  const [url, setUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLinks().then(setLinks).catch(() => setError('Failed to load links'));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const newLink = await shortenUrl(url, alias || undefined);
      setLinks(prev => [newLink, ...prev]);
      setUrl('');
      setAlias('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      setError(typeof msg === 'string' ? msg : 'Failed to shorten URL');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(code: string) {
    await deleteLink(code);
    setLinks(prev => prev.filter(l => l.code !== code));
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Shorten a URL</h2>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 flex-wrap">
          <input
            type="url"
            required
            placeholder="https://example.com/long-url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            className="flex-1 min-w-0 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="alias (optional)"
            value={alias}
            onChange={e => setAlias(e.target.value)}
            className="w-40 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Shortening…' : 'Shorten'}
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {links.map(link => (
          <div key={link.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-mono font-semibold text-blue-600 truncate">
                {link.shortUrl ?? `${window.location.origin}/${link.code}`}
              </p>
              <p className="text-xs text-gray-400 truncate mt-0.5">{link.original_url}</p>
            </div>
            <span className="text-sm text-gray-500 whitespace-nowrap">{link.click_count} clicks</span>
            <Link
              to={`/analytics/${link.code}`}
              className="text-sm text-blue-600 hover:underline whitespace-nowrap"
            >
              Analytics
            </Link>
            <button
              onClick={() => handleDelete(link.code)}
              className="text-sm text-red-500 hover:text-red-700 whitespace-nowrap"
            >
              Delete
            </button>
          </div>
        ))}
        {links.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-16">No links yet — shorten something above.</p>
        )}
      </div>
    </div>
  );
}
