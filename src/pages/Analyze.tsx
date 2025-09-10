import React from 'react';
import Navbar from '../components/Navbar';
import App from '../App';

export default function Analyze() {
  return (
    <div className="min-h-screen bg-slate-50 text-gray-900">
      <Navbar />
      <main className="container mx-auto px-4 py-10">
        <App />
      </main>
    </div>
  );
}


