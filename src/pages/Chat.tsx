import React, { useMemo, useState } from 'react';
import { ArrowLeft, Github, SendHorizonal, Loader2, MessageSquare, FileCode2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { chatAboutProject } from '../services/analysis';
import { parseRepoUrl, fetchRepositoryData } from '../services/github';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function Chat() {
  const [repoUrl, setRepoUrl] = useState(() => {
    try { return localStorage.getItem('proanalyze:lastRepoUrl') || ''; } catch { return ''; }
  });
  const [loadingRepo, setLoadingRepo] = useState(false);
  const [repoName, setRepoName] = useState<string | undefined>(undefined);
  const [files, setFiles] = useState<{ name: string; content: string }[]>([]);
  const [summary, setSummary] = useState<string>('');

  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'system',
    content: 'Ask anything about your repository. I will answer using the repository files you load here.',
  }]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const canChat = useMemo(() => files.length > 0, [files.length]);

  async function handleLoadRepo(e: React.FormEvent) {
    e.preventDefault();
    setLoadingRepo(true);
    try {
      const { owner, repo } = await parseRepoUrl(repoUrl);
      const data = await fetchRepositoryData(owner, repo);
      setRepoName(data.name);
      setFiles(data.files.map(f => ({ name: f.path, content: f.content })));
      setSummary(`${data.description || ''}\nLanguage: ${data.language}\nStars: ${data.stars} Forks: ${data.forks}`);
      try { localStorage.setItem('proanalyze:lastRepoUrl', repoUrl); } catch {}
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: err instanceof Error ? err.message : 'Failed to load repository' }]);
    } finally {
      setLoadingRepo(false);
    }
  }

  // Auto-load if we have a stored repo URL
  React.useEffect(() => {
    if (repoUrl && files.length === 0 && !loadingRepo) {
      handleLoadRepo(new Event('submit') as unknown as React.FormEvent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);
    try {
      const answer = await chatAboutProject(userMsg.content, { repoName, summary, files });
      setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: err instanceof Error ? err.message : 'Chat failed. Please try again.' }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900">
      <Navbar />
      <div className="container mx-auto px-4 py-10 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-800">
              <ArrowLeft className="w-5 h-5" />
              Back
            </Link>
            <div className="flex items-center gap-2 ml-4">
              <MessageSquare className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold">Project Chat</h1>
            </div>
          </div>
        </div>

        <form onSubmit={handleLoadRepo} className="mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="Enter GitHub repository URL to chat about"
              className="flex-1 px-4 py-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none text-gray-900 placeholder-gray-400"
            />
            <button
              type="submit"
              disabled={loadingRepo}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold inline-flex items-center gap-2 disabled:opacity-60"
            >
              {loadingRepo ? <Loader2 className="w-5 h-5 animate-spin" /> : <Github className="w-5 h-5" />}
              {loadingRepo ? 'Loading…' : 'Load Repo'}
            </button>
          </div>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-4 flex flex-col h-[70vh]">
            <div className="flex-1 overflow-auto space-y-4 pr-1">
              {messages.map((m, idx) => (
                <div key={idx} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                  <div className={
                    'inline-block max-w-[90%] rounded-lg px-3 py-2 whitespace-pre-wrap ' +
                    (m.role === 'user' ? 'bg-blue-600 text-white' : m.role === 'assistant' ? 'bg-gray-100 text-gray-900' : 'bg-gray-50 text-gray-700')
                  }>
                    {m.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="text-left">
                  <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-900 rounded-lg px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Thinking…
                  </div>
                </div>
              )}
            </div>
            <form onSubmit={handleSend} className="mt-3 flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={canChat ? 'Ask a question about this codebase…' : 'Load a repository first'}
                disabled={!canChat || sending}
                className="flex-1 px-4 py-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none text-gray-900 placeholder-gray-400 disabled:bg-gray-50"
              />
              <button
                type="submit"
                disabled={!canChat || sending}
                className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold inline-flex items-center gap-2 disabled:opacity-60"
              >
                <SendHorizonal className="w-5 h-5" />
                Send
              </button>
            </form>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 h-[70vh] overflow-auto">
            <div className="flex items-center gap-2 mb-3">
              <FileCode2 className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold">Loaded Context</h2>
            </div>
            {repoName ? (
              <div className="text-sm text-gray-700">
                <div className="mb-2"><span className="font-medium">Repository:</span> {repoName}</div>
                <div className="whitespace-pre-wrap text-gray-600">{summary}</div>
                <div className="mt-3 font-medium">Files ({files.length}):</div>
                <ul className="mt-1 space-y-1">
                  {files.slice(0, 50).map((f, i) => (
                    <li key={i} className="text-gray-600 truncate">{f.name}</li>
                  ))}
                  {files.length > 50 && (
                    <li className="text-gray-500">… and {files.length - 50} more</li>
                  )}
                </ul>
              </div>
            ) : (
              <div className="text-sm text-gray-500">No repository loaded yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


