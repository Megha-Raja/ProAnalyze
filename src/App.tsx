import React, { useState } from 'react';
import { Github, FileCode, Loader2, Box, Code2, Cpu, Workflow, Users, Star, ArrowUpCircle, BarChart as GitFlowChart } from 'lucide-react';
import { parseRepoUrl, fetchRepositoryData } from './services/github';
import { analyzeCode, generateWorkflowDiagrams } from './services/analysis';
import type { RepositoryData } from './types';
import parse from 'html-react-parser';

function AnalysisSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 hover:border-blue-400/50 transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <Icon className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      </div>
      <div className="prose max-w-none">
        {children}
      </div>
    </div>
  );
}

function renderInlineWithBold(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<strong key={parts.length}>{match[1]}</strong>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

function SectionContent({ content }: { content: string }) {
  const lines = content.split('\n').map(l => l.trim());
  const elements: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  function flushList() {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc pl-5 space-y-1 mb-4">
          {listBuffer.map((item, idx) => (
            <li key={idx}>{renderInlineWithBold(item)}</li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  }

  lines.forEach((line) => {
    if (!line) return;
    if (line.startsWith('- ')) {
      listBuffer.push(line.slice(2));
      return;
    }
    if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h3 key={`h-${elements.length}`} className="text-xl font-bold mb-3">
          {renderInlineWithBold(line.slice(2))}
        </h3>
      );
      return;
    }
    flushList();
    elements.push(
      <p key={`p-${elements.length}`} className="mb-3">
        {renderInlineWithBold(line)}
      </p>
    );
  });

  flushList();
  return <>{elements}</>;
}

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RepositoryData | null>(null);
  const [workflowDiagrams, setWorkflowDiagrams] = useState<{ system: string; user: string } | null>(null);
  const [generatingDiagram, setGeneratingDiagram] = useState(false);
  const [diagramError, setDiagramError] = useState<string | null>(null);

  async function handleGenerateWorkflowDiagrams() {
    if (!data?.analysis) return;

    setGeneratingDiagram(true);
    setDiagramError(null);
    setWorkflowDiagrams(null);

    try {
      const workflowSection = data.analysis.match(/# Project Workflow\n([\s\S]*?)(?=\n# |$)/)?.[1] || '';
      if (!workflowSection.trim()) {
        throw new Error('No workflow information found in the analysis');
      }

      const diagrams = await generateWorkflowDiagrams(workflowSection);
      setWorkflowDiagrams(diagrams);
    } catch (err) {
      console.error('Diagram generation error:', err);
      setDiagramError(err instanceof Error ? err.message : 'Failed to generate workflow diagrams');
    } finally {
      setGeneratingDiagram(false);
    }
  }

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setData(null);
    setWorkflowDiagrams(null);
    setDiagramError(null);

    try {
      // Persist last used repo URL for Chat page to reuse
      try { localStorage.setItem('proanalyze:lastRepoUrl', url); } catch {}
      const { owner, repo } = await parseRepoUrl(url);
      const repoData = await fetchRepositoryData(owner, repo);
      
      setData({ ...repoData, analysis: 'Analyzing repository...' });
      
      const analysis = await analyzeCode(repoData.files);
      setData(prevData => prevData ? { ...prevData, analysis } : null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      setData(prevData => prevData ? { ...prevData, analysis: 'Analysis failed: ' + errorMessage } : null);
    } finally {
      setLoading(false);
    }
  }

  function parseAnalysisSection(analysis: string, sectionTitle: string): string {
    const regex = new RegExp(`## ${sectionTitle}\\n([\\s\\S]*?)(?=## |$)`);
    const match = analysis.match(regex);
    return match ? match[1].trim() : 'No information available.';
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white text-gray-900">
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center mb-12">
          <FileCode className="w-12 h-12 mr-4 text-blue-600" />
          <h1 className="text-4xl font-bold">ProAnalyze</h1>
        </div>

        <form onSubmit={handleAnalyze} className="max-w-2xl mx-auto mb-12">
          <div className="flex gap-4">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter GitHub repository URL"
              className="flex-1 px-4 py-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none text-gray-900 placeholder-gray-400"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Github className="w-5 h-5" />
              )}
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
        </form>

        {error && !data && (
          <div className="max-w-2xl mx-auto p-4 bg-red-50 border border-red-300 rounded-lg text-red-700 mb-8">
            {error}
          </div>
        )}

        {data && (
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8 bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-2xl font-bold">{data.name}</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-4 text-gray-500">
                  <span className="flex items-center gap-2">
                    ⭐ {data.stars}
                  </span>
                  <span className="flex items-center gap-2">
                    🍴 {data.forks}
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    {data.language}
                  </span>
                </div>
                {data.analysis && (
                  <button
                    onClick={handleGenerateWorkflowDiagrams}
                    disabled={generatingDiagram}
                    className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    {generatingDiagram ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <GitFlowChart className="w-5 h-5" />
                    )}
                    Generate Workflow Diagrams
                  </button>
                )}
              </div>
            </div>

            {diagramError && (
              <div className="mb-8 p-4 bg-red-50 border border-red-300 rounded-lg text-red-700">
                {diagramError}
              </div>
            )}

            {workflowDiagrams && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-white rounded-xl p-4">
                  <h3 className="text-gray-800 font-bold mb-2">System Workflow</h3>
                  <div className="flex justify-center items-start h-[500px] overflow-auto">
                    <div className="diagram-container">
                      {parse(workflowDiagrams.system)}
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4">
                  <h3 className="text-gray-800 font-bold mb-2">User Workflow</h3>
                  <div className="flex justify-center items-start h-[500px] overflow-auto">
                    <div className="diagram-container">
                      {parse(workflowDiagrams.user)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {data.analysis && data.analysis !== 'Analyzing repository...' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <AnalysisSection title="Project Overview" icon={Box}>
                  <SectionContent content={parseAnalysisSection(data.analysis, 'Project Overview')} />
                </AnalysisSection>

                <AnalysisSection title="Key Features" icon={Code2}>
                  <SectionContent content={parseAnalysisSection(data.analysis, 'Key Features')} />
                </AnalysisSection>

                <AnalysisSection title="Technologies" icon={Cpu}>
                  <SectionContent content={parseAnalysisSection(data.analysis, 'Libraries & Dependencies')} />
                </AnalysisSection>

                <AnalysisSection title="Project Workflow" icon={Workflow}>
                  <SectionContent content={parseAnalysisSection(data.analysis, 'Project Workflow')} />
                </AnalysisSection>

                <AnalysisSection title="Implementation Details" icon={Users}>
                  <SectionContent content={parseAnalysisSection(data.analysis, 'Implementation Details')} />
                </AnalysisSection>

                <AnalysisSection title="Project Strengths" icon={Star}>
                  <SectionContent content={parseAnalysisSection(data.analysis, 'Project Strengths')} />
                </AnalysisSection>

                <AnalysisSection title="Areas for Improvement" icon={ArrowUpCircle}>
                  <SectionContent content={parseAnalysisSection(data.analysis, 'Areas for Improvement')} />
                </AnalysisSection>
              </div>
            )}

            <div className="mt-8">
              <h3 className="text-xl font-bold mb-4">Files Analyzed</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.files.map((file) => (
                  <div
                    key={file.path}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-mono text-sm">{file.path}</span>
                    <span className="text-sm text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;