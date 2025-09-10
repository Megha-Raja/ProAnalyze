import React from 'react';
import { FileCode, Rocket, Workflow, LineChart } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-blue-50 to-white text-gray-900">
      <Navbar />
      <main className="container mx-auto px-4 py-20">
        <section className="text-center max-w-4xl mx-auto mb-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 mb-5 shadow-sm">
            <FileCode className="w-7 h-7" />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight mb-4">Decode any repo in minutes</h1>
          <p className="text-xl text-gray-600 mb-10">AI-powered repository insights, professional diagrams, and an expert chat for everything about your project.</p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/analyze" className="px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md">Start Analyzing</Link>
            <Link to="/chat" className="px-7 py-3 rounded-xl bg-white/70 backdrop-blur border border-blue-200 hover:bg-white text-blue-700 font-semibold shadow-sm">Ask the AI</Link>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <div className="bg-white/80 backdrop-blur border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
              <Rocket className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Rapid Understanding</h3>
            <p className="text-gray-600">Generate a clear, structured overview of any repository with strengths, gaps, and improvement ideas.</p>
          </div>
          <div className="bg-white/80 backdrop-blur border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
              <Workflow className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Visual Workflows</h3>
            <p className="text-gray-600">See system and user flows at a glance with auto-generated diagrams.</p>
          </div>
          <div className="bg-white/80 backdrop-blur border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
              <LineChart className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Ask Anything</h3>
            <p className="text-gray-600">An AI tuned to your repo’s code answers architecture, flow, and implementation questions.</p>
          </div>
        </section>
      </main>
    </div>
  );
}


