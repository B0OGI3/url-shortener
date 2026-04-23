import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center gap-6">
            <Link to="/" className="text-xl font-bold text-blue-600">Shrtnr</Link>
            <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analytics/:code" element={<Analytics />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
