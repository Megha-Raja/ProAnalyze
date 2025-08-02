import React, { useState, useEffect } from 'react';
import { Github, FileCode, Loader2, Box, Code2, Cpu, Workflow, Users, Lightbulb, Star, ArrowUpCircle, BarChart as GitFlowChart } from 'lucide-react';
import { parseRepoUrl, fetchRepositoryData } from './services/github';
import { analyzeCode, generateWorkflowDiagrams } from './services/analysis';
import type { RepositoryData } from './types';
import parse from 'html-react-parser';

function AnalysisSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700 hover:border-blue-500/50 transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <Icon className="w-6 h-6 text-blue-400" />
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>
      <div className="prose prose-invert max-w-none">
        {children}
      </div>
    </div>
  );
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center mb-12">
          <FileCode className="w-12 h-12 mr-4 text-blue-400" />
          <h1 className="text-4xl font-bold">ProAnalyze</h1>
        </div>

        <form onSubmit={handleAnalyze} className="max-w-2xl mx-auto mb-12">
          <div className="flex gap-4">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter GitHub repository URL"
              className="flex-1 px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:outline-none text-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50 transition-colors"
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
          <div className="max-w-2xl mx-auto p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200 mb-8">
            {error}
          </div>
        )}

        {data && (
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8 bg-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold">{data.name}</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-4 text-gray-400">
                  <span className="flex items-center gap-2">
                    ⭐ {data.stars}
                  </span>
                  <span className="flex items-center gap-2">
                    🍴 {data.forks}
                  </span>
                  <span className="px-3 py-1 bg-gray-700 rounded-full text-sm">
                    {data.language}
                  </span>
                </div>
                {data.analysis && (
                  <button
                    onClick={handleGenerateWorkflowDiagrams}
                    disabled={generatingDiagram}
                    className="ml-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50 transition-colors"
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
              <div className="mb-8 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
                {diagramError}
              </div>
            )}

            {workflowDiagrams && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-white rounded-xl p-4 overflow-hidden">
                  <h3 className="text-gray-800 font-bold mb-2">System Workflow</h3>
                  <div className="flex justify-center items-center h-[500px] overflow-auto">
                    <div className="diagram-container" style={{ transform: 'scale(0.9)', transformOrigin: 'center' }}>
                      {parse(workflowDiagrams.system)}
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 overflow-hidden">
                  <h3 className="text-gray-800 font-bold mb-2">User Workflow</h3>
                  <div className="flex justify-center items-center h-[500px] overflow-auto">
                    <div className="diagram-container" style={{ transform: 'scale(0.9)', transformOrigin: 'center' }}>
                      {parse(workflowDiagrams.user)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {data.analysis && data.analysis !== 'Analyzing repository...' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnalysisSection title="Project Overview" icon={Box}>
                  <div dangerouslySetInnerHTML={{ 
                    __html: parseAnalysisSection(data.analysis, 'Project Overview')
                      .split('\n')
                      .map(line => line.startsWith('# ') ? `<h1 class="text-2xl font-bold mb-4">${line.slice(2)}</h1>` : `<p>${line}</p>`)
                      .join('')
                  }} />
                </AnalysisSection>

                <AnalysisSection title="Key Features" icon={Code2}>
                  <div dangerouslySetInnerHTML={{ 
                    __html: parseAnalysisSection(data.analysis, 'Key Features')
                      .split('\n')
                      .map(line => line.startsWith('# ') ? `<h1 class="text-2xl font-bold mb-4">${line.slice(2)}</h1>` : line.startsWith('- ') ? `<li>${line.slice(2)}</li>` : `<p>${line}</p>`)
                      .join('')
                  }} />
                </AnalysisSection>

                <AnalysisSection title="Technologies" icon={Cpu}>
                  <div dangerouslySetInnerHTML={{ 
                    __html: parseAnalysisSection(data.analysis, 'Libraries & Dependencies')
                      .split('\n')
                      .map(line => line.startsWith('# ') ? `<h1 class="text-2xl font-bold mb-4">${line.slice(2)}</h1>` : line.startsWith('- ') ? `<li>${line.slice(2)}</li>` : `<p>${line}</p>`)
                      .join('')
                  }} />
                </AnalysisSection>

                <AnalysisSection title="Project Workflow" icon={Workflow}>
                  <div dangerouslySetInnerHTML={{ 
                    __html: parseAnalysisSection(data.analysis, 'Project Workflow')
                      .split('\n')
                      .map(line => line.startsWith('# ') ? `<h1 class="text-2xl font-bold mb-4">${line.slice(2)}</h1>` : line.startsWith('- ') ? `<li>${line.slice(2)}</li>` : `<p>${line}</p>`)
                      .join('')
                  }} />
                </AnalysisSection>

                <AnalysisSection title="Implementation Details" icon={Users}>
                  <div dangerouslySetInnerHTML={{ 
                    __html: parseAnalysisSection(data.analysis, 'Implementation Details')
                      .split('\n')
                      .map(line => line.startsWith('# ') ? `<h1 class="text-2xl font-bold mb-4">${line.slice(2)}</h1>` : line.startsWith('- ') ? `<li>${line.slice(2)}</li>` : `<p>${line}</p>`)
                      .join('')
                  }} />
                </AnalysisSection>

                <AnalysisSection title="Project Strengths" icon={Star}>
                  <div dangerouslySetInnerHTML={{ 
                    __html: parseAnalysisSection(data.analysis, 'Project Strengths')
                      .split('\n')
                      .map(line => line.startsWith('# ') ? `<h1 class="text-2xl font-bold mb-4">${line.slice(2)}</h1>` : line.startsWith('- ') ? `<li>${line.slice(2)}</li>` : `<p>${line}</p>`)
                      .join('')
                  }} />
                </AnalysisSection>

                <AnalysisSection title="Areas for Improvement" icon={ArrowUpCircle}>
                  <div dangerouslySetInnerHTML={{ 
                    __html: parseAnalysisSection(data.analysis, 'Areas for Improvement')
                      .split('\n')
                      .map(line => line.startsWith('# ') ? `<h1 class="text-2xl font-bold mb-4">${line.slice(2)}</h1>` : line.startsWith('- ') ? `<li>${line.slice(2)}</li>` : `<p>${line}</p>`)
                      .join('')
                  }} />
                </AnalysisSection>
              </div>
            )}

            <div className="mt-8">
              <h3 className="text-xl font-bold mb-4">Files Analyzed</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.files.map((file) => (
                  <div
                    key={file.path}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700/70 transition-colors"
                  >
                    <span className="font-mono text-sm">{file.path}</span>
                    <span className="text-sm text-gray-400">
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