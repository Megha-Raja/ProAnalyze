import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const linkClass = (active: boolean) =>
    `px-4 py-2 rounded-lg font-medium transition-colors ${
      active
        ? 'bg-white/20 text-white'
        : 'text-white/90 hover:text-white hover:bg-white/10'
    }`;

  return (
    <header className="sticky top-0 z-20 shadow-md bg-gradient-to-r from-blue-700 to-blue-600">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-extrabold tracking-tight text-white antialiased">ProAnalyze</Link>
        <nav className="flex items-center gap-2">
          <Link to="/" className={linkClass(isActive('/'))}>Home</Link>
          <Link to="/analyze" className={linkClass(isActive('/analyze'))}>Analyze</Link>
          <Link to="/chat" className={linkClass(isActive('/chat'))}>AI Chat</Link>
        </nav>
      </div>
    </header>
  );
}


