import axios from 'axios';
import { Graphviz } from '@hpcc-js/wasm';

// Configuration
const CONFIG = {
  model: {
    url: 'https://api.together.xyz/v1/chat/completions',
    name: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    maxTokens: 4096
  },
  maxFiles: 5,
  maxFileSize: 2000,
  maxRetries: 3,
  baseDelay: 2000
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function isPythonFile(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop();
  return ext === 'py' || ext === 'ipynb';
}

function truncateContent(content: string): string {
  if (content.length <= CONFIG.maxFileSize) return content;
  return content.slice(0, CONFIG.maxFileSize) + '\n... (truncated)';
}

function sanitizeContent(content: string): string {
  return content
    .replace(/import os[\s\S]*?os\.environ/g, 'import os # Environment handling')
    .replace(/api_key\s*=\s*["'].*?["']/g, 'api_key = "***"')
    .replace(/password\s*=\s*["'].*?["']/g, 'password = "***"')
    .replace(/secret\s*=\s*["'].*?["']/g, 'secret = "***"');
}

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  isSystem: boolean;
}

interface WorkflowDiagrams {
  system: string;
  user: string;
}

let graphvizInstance: Promise<Graphviz> | null = null;

async function getGraphviz(): Promise<Graphviz> {
  if (!graphvizInstance) {
    graphvizInstance = Graphviz.load();
  }
  return graphvizInstance;
}

async function extractWorkflowStepsWithAI(workflowText: string): Promise<WorkflowStep[]> {
  try {
    const prompt = `<s>[INST] You are a workflow analysis expert. Analyze this workflow description and extract distinct steps for both system and user workflows. The description is from a code analysis:

${workflowText}

Create two separate workflows:
1. System Workflow (Internal):
   - Focus on technical implementation details
   - Include key system processes and data flow
   - Describe internal operations and technology usage
   - Show how different components interact

2. User Workflow (External):
   - Focus on user interactions and experience
   - Show step-by-step user journey
   - Include user actions and system responses
   - Describe what users see and do

Format your response as a JSON array of steps, where each step has:
{
  "title": "Brief, clear action title",
  "description": "Concise, specific description of what happens",
  "isSystem": boolean (true for system workflow, false for user workflow)
}

Requirements:
- Each step must be clear and specific
- Descriptions should be concise but informative
- Focus on actual workflow steps, not generic processes
- Ensure logical flow between steps
- MUST have at least 6-8 steps for BOTH system and user workflows
- Balance the number of steps between system and user workflows[/INST]</s>`;

    const response = await axios.post(
      CONFIG.model.url,
      {
        model: CONFIG.model.name,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048,
        temperature: 0.3,
        top_p: 0.9
      },
      {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_TOGETHER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    if (!response.data?.choices?.[0]?.message?.content) {
      throw new Error('Invalid AI response format');
    }

    const content = response.data.choices[0].message.content;
    let steps: WorkflowStep[] = [];

    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsedSteps = JSON.parse(jsonMatch[0]);
        steps = parsedSteps.map((step: any, index: number) => ({
          id: `step${index + 1}`,
          title: step.title,
          description: step.description,
          isSystem: step.isSystem
        }));
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error('Failed to parse workflow steps from AI response');
    }

    if (steps.length === 0) {
      throw new Error('No workflow steps extracted from AI analysis');
    }

    // Ensure balanced steps between system and user workflows
    const systemSteps = steps.filter(step => step.isSystem);
    const userSteps = steps.filter(step => !step.isSystem);

    if (systemSteps.length < 4 || userSteps.length < 4) {
      // If we don't have enough steps, create some default ones
      const defaultSystemSteps = [
        { id: 'sys1', title: 'System Initialization', description: 'Initialize system components and load configurations', isSystem: true },
        { id: 'sys2', title: 'Input Processing', description: 'Process and validate user inputs', isSystem: true },
        { id: 'sys3', title: 'Core Processing', description: 'Execute main business logic and algorithms', isSystem: true },
        { id: 'sys4', title: 'Output Generation', description: 'Generate and format results for display', isSystem: true }
      ];
      
      const defaultUserSteps = [
        { id: 'user1', title: 'Access Application', description: 'User opens and accesses the application interface', isSystem: false },
        { id: 'user2', title: 'Provide Input', description: 'User enters required data or configuration', isSystem: false },
        { id: 'user3', title: 'Initiate Process', description: 'User starts the main application process', isSystem: false },
        { id: 'user4', title: 'Review Results', description: 'User examines the generated output and results', isSystem: false }
      ];
      
      // Combine existing steps with defaults if needed
      const finalSystemSteps = systemSteps.length >= 4 ? systemSteps : [...systemSteps, ...defaultSystemSteps.slice(systemSteps.length)];
      const finalUserSteps = userSteps.length >= 4 ? userSteps : [...userSteps, ...defaultUserSteps.slice(userSteps.length)];
      
      return [...finalSystemSteps, ...finalUserSteps];
    }

    return steps;
  } catch (error) {
    console.error('Error in extractWorkflowStepsWithAI:', error);
    throw error;
  }
}

function formatLabel(title: string, description: string): string {
  const maxLineLength = 30;
  const lines: string[] = [];
  
  // Format title
  let currentLine = '';
  const titleWords = title.split(' ');
  
  for (const word of titleWords) {
    if ((currentLine + ' ' + word).length <= maxLineLength) {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  // Add description
  if (description) {
    lines.push(''); // Add blank line between title and description
    currentLine = '';
    const descWords = description.split(' ');
    
    for (const word of descWords) {
      if ((currentLine + ' ' + word).length <= maxLineLength) {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  return lines.join('\\n');
}

async function generateDiagram(steps: WorkflowStep[]): Promise<string> {
  try {
    const graphviz = await getGraphviz();

    const dotSource = `
      digraph Workflow {
        // Graph settings
        rankdir=TB;
        splines=ortho;
        nodesep=0.8;
        ranksep=1.0;
        fontname="Arial";
        margin=0.2;
        pad=0.4;
        
        // Node defaults
        node [
          shape=box,
          style=filled,
          fillcolor="#f0f4f8",
          color="#2d3748",
          fontname="Arial",
          fontsize=11,
          margin="0.2,0.1",
          penwidth=1.5
        ];
        
        edge [
          color="#4a5568",
          penwidth=1.2,
          arrowsize=0.8
        ];
        
        // Nodes
        ${steps.map(step => 
          `"${step.id}" [label="${formatLabel(step.title, step.description)}"];`
        ).join('\n        ')}
        
        // Edges
        ${steps.map((step, index) => {
          if (index === steps.length - 1) return '';
          return `"${step.id}" -> "${steps[index + 1].id}";`;
        }).filter(Boolean).join('\n        ')}
      }
    `;

    return await graphviz.layout(dotSource, "svg", "dot");
  } catch (error) {
    console.error('Failed to generate diagram:', error);
    throw new Error('Failed to generate workflow diagram. Please try again.');
  }
}

export async function generateWorkflowDiagrams(workflowText: string): Promise<WorkflowDiagrams> {
  try {
    const allSteps = await extractWorkflowStepsWithAI(workflowText);
    
    if (allSteps.length === 0) {
      throw new Error('Could not extract workflow steps from the analysis text');
    }

    const systemSteps = allSteps.filter(step => step.isSystem);
    const userSteps = allSteps.filter(step => !step.isSystem);

    const [systemDiagram, userDiagram] = await Promise.all([
      generateDiagram(systemSteps),
      generateDiagram(userSteps)
    ]);

    return {
      system: systemDiagram,
      user: userDiagram
    };
  } catch (error) {
    console.error('Error in generateWorkflowDiagrams:', error);
    throw error;
  }
}

function formatAnalysis(analysis: string): string {
  analysis = analysis.replace(/<[^>]+>/g, '');
  
  const sections = [
    'Project Overview',
    'Key Features',
    'Libraries & Dependencies',
    'Project Workflow',
    'Implementation Details',
    'Project Strengths',
    'Areas for Improvement'
  ];

  let formatted = analysis.trim();
  formatted = formatted.replace(/^(system|assistant|user):\s*/gmi, '').trim();

  sections.forEach(section => {
    const sectionRegex = new RegExp(`## ${section}\\n([\\s\\S]*?)(?=## |$)`);
    const match = formatted.match(sectionRegex);
    if (match) {
      const content = match[1].trim();
      const formattedContent = content.split('\n').map(line => {
        if (line.startsWith('- ')) {
          return line;
        }
        if (/^\d+\./.test(line)) {
          return `- ${line.replace(/^\d+\.\s*/, '')}`;
        }
        return line;
      }).join('\n');
      
      formatted = formatted.replace(
        match[0],
        `## ${section}\n${formattedContent}\n`
      );
    }
  });

  const existingSections: Record<string, string> = {};
  sections.forEach(section => {
    const regex = new RegExp(`## ${section}\\n([\\s\\S]*?)(?=## |$)`);
    const match = formatted.match(regex);
    if (match && match[1].trim()) {
      existingSections[section] = match[1].trim();
    }
  });

  const criticalSections = ['Project Workflow', 'Project Strengths', 'Areas for Improvement'];
  const missingCritical = criticalSections.some(section => !existingSections[section]);

  if (missingCritical) {
    console.log('Critical sections missing, retrying...');
    return '';
  }

  formatted = sections.map(section => {
    const content = existingSections[section] || 'Information not available. Please try analyzing the repository again.';
    return `## ${section}\n${content}\n`;
  }).join('\n');

  return formatted
    .split('\n')
    .filter((line, index, arr) => {
      if (line.trim() === '' && index > 0 && arr[index - 1].trim() === '') {
        return false;
      }
      return true;
    })
    .join('\n');
}

function generateAnalysisPrompt(files: { name: string; content: string }[]): string {
  const pythonFiles = files
    .filter(file => isPythonFile(file.name))
    .slice(0, CONFIG.maxFiles)
    .map(file => ({
      name: file.name,
      content: sanitizeContent(truncateContent(file.content))
    }));

  if (pythonFiles.length === 0) {
    return 'No Python files found in this repository.';
  }

  const filesSummary = pythonFiles
    .map(file => `### ${file.name}\n\`\`\`python\n${file.content}\n\`\`\``)
    .join('\n\n');

  return `<s>[INST] You are a senior code analysis expert. Analyze these Python files and provide a comprehensive technical summary.

Files to analyze:

${filesSummary}

You MUST provide a detailed analysis in this exact format, ensuring ALL sections are complete with substantial information:

## Project Overview
[Write 2-3 detailed paragraphs explaining:
- The main purpose and goals of the project
- The core methodology and approach used
- The problem it solves and its significance
Be specific about the project's role and impact.]

## Key Features
[List at least 6-8 main features, with each feature having 2-3 lines of explanation:
- Feature 1: Detailed description of what it does and how it benefits users
- Feature 2: Detailed description of what it does and how it benefits users
(continue with all features)
Focus on user-facing functionality and technical capabilities.]

## Libraries & Dependencies
[List ALL important libraries (at least 5-6) with 2-3 lines about their role:
- Library 1: Detailed explanation of how it's used in the project and why it's essential
- Library 2: Detailed explanation of how it's used in the project and why it's essential
(continue with all libraries)
Include both direct and indirect dependencies that are crucial.]

## Project Workflow
[CRITICAL: Provide a detailed, step-by-step explanation of how the project works from start to finish:
1. Initial Setup: How the system is initialized and configured
2. User Input: How users interact with the system and what inputs they provide
3. Processing Flow: How the system processes the inputs and what happens internally
4. Data Handling: How data flows through different components
5. Output Generation: How results are calculated and presented
6. Error Handling: How the system manages errors and edge cases

Each step MUST have 2-3 lines of detailed explanation.
Focus on the actual user journey and system operation flow.]

## Implementation Details
[List at least 6-7 key technical aspects with detailed explanations:
- Implementation 1: Detailed explanation of the technical approach and why it was chosen
- Implementation 2: Detailed explanation of the technical approach and why it was chosen
(continue with all implementations)
Include architecture decisions, design patterns, and technical solutions.]

## Project Strengths
[CRITICAL: List at least 5-6 major strengths with detailed explanations:
- Strength 1: Detailed explanation of why this is a strength and its impact
- Strength 2: Detailed explanation of why this is a strength and its impact
(continue with all strengths)
Focus on technical excellence, user benefits, and project advantages.]

## Areas for Improvement
[CRITICAL: List at least 4-5 specific suggestions for enhancement:
- Improvement 1: Detailed suggestion for future enhancement or expansion
- Improvement 2: Detailed suggestion for future enhancement or expansion
(continue with all improvements)
Focus ONLY on concrete improvement opportunities and future enhancements.
Each suggestion MUST include both what to improve and how to improve it.]

CRITICAL REQUIREMENTS:
1. ALL sections MUST be completed with the minimum number of points specified
2. Each point MUST have at least 2-3 lines of detailed explanation
3. The Project Workflow MUST describe the actual step-by-step operation flow
4. Project Strengths MUST highlight unique advantages and capabilities
5. Areas for Improvement MUST focus on concrete enhancement opportunities
6. Use technical language but ensure explanations are clear and specific
7. DO NOT skip or leave any section empty[/INST]</s>`;
}

async function makeAnalysisRequest(prompt: string, attempt: number) {
  try {
    console.log(`Attempting analysis with Mixtral (attempt ${attempt})`);
    
    const response = await axios.post(
      CONFIG.model.url,
      {
        model: CONFIG.model.name,
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: CONFIG.model.maxTokens,
        temperature: 0.3,
        top_p: 0.9
      },
      {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_TOGETHER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    if (response.status === 200 && response.data?.choices?.[0]?.message?.content) {
      const analysis = response.data.choices[0].message.content.trim();

      if (analysis.length < 50) {
        console.log('Response too short, retrying...');
        return null;
      }

      const formattedAnalysis = formatAnalysis(analysis);
      if (!formattedAnalysis) {
        console.log('Critical sections missing, retrying...');
        return null;
      }

      return formattedAnalysis;
    }
    
    console.log('Invalid response format:', response.data);
    return null;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Analysis request failed:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });

      if (error.response?.status === 401) {
        throw new Error('Invalid Together AI API key. Please check your configuration.');
      }
      
      if (error.response?.status === 429 || error.response?.status === 503) {
        const delay = CONFIG.baseDelay * Math.pow(2, attempt - 1);
        console.log(`Rate limit or service unavailable, waiting ${delay}ms...`);
        await sleep(delay);
        return null;
      }

      throw new Error(`API request failed: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}

export async function analyzeCode(files: { name: string; content: string }[]): Promise<string> {
  console.log('Starting code analysis...');
  const prompt = generateAnalysisPrompt(files);

  if (prompt === 'No Python files found in this repository.') {
    return `# Project Analysis

This repository does not contain any Python files (.py or .ipynb). Please try analyzing a Python project.`;
  }

  console.log(`Found Python files to analyze. Prompt length: ${prompt.length}`);
  
  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      const analysis = await makeAnalysisRequest(prompt, attempt);
      
      if (analysis) {
        return `# Python Project Analysis

${analysis}`;
      }

      if (attempt === CONFIG.maxRetries) {
        throw new Error('Analysis failed after multiple attempts. The model response was invalid.');
      }
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      if (attempt === CONFIG.maxRetries) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Analysis failed after multiple attempts. Please try again later.');
      }
    }
  }
}

export async function chatAboutProject(
  question: string,
  project: {
    repoName?: string;
    summary?: string;
    files?: { name: string; content: string }[];
  }
): Promise<string> {
  const contextFiles = (project.files || [])
    .slice(0, 6)
    .map(f => ({ name: f.name, content: truncateContent(sanitizeContent(f.content)) }));

  const filesBlock = contextFiles
    .map(f => `### ${f.name}\n\n\u0060\u0060\u0060\n${f.content}\n\u0060\u0060\u0060`)
    .join('\n\n');

  const systemPrompt = `You are an expert repository assistant for the project ${project.repoName || ''}.
You answer developer questions with precise, actionable, technically accurate explanations grounded strictly in the provided repository context.
If information is missing, say what is unknown and suggest where to look.
Prefer concrete code-level references (files, functions, data flow) and short examples.`;

  const userPrompt = `CONTEXT FILES:\n${filesBlock}\n\nPROJECT SUMMARY (if any):\n${project.summary || 'N/A'}\n\nQUESTION:\n${question}\n\nRESPONSE REQUIREMENTS:\n- Answer directly and concisely first.\n- Cite specific files/paths when referring to code.\n- If code snippets are needed, keep them short.\n- If uncertain, call out the uncertainty explicitly.`;

  const resp = await axios.post(
    CONFIG.model.url,
    {
      model: CONFIG.model.name,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 800,
      temperature: 0.2,
      top_p: 0.9,
    },
    {
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 45000,
    }
  );

  const content = resp.data?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('No response from the chat model');
  return content;
}