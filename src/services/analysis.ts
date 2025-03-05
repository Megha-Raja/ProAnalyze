import axios from 'axios';

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

function formatAnalysis(analysis: string): string {
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

  // Remove any potential system or assistant markers
  formatted = formatted.replace(/^(system|assistant|user):\s*/gmi, '').trim();

  // Extract existing sections and ensure they're not empty
  const existingSections: Record<string, string> = {};
  sections.forEach(section => {
    const regex = new RegExp(`## ${section}\\n([\\s\\S]*?)(?=## |$)`);
    const match = formatted.match(regex);
    if (match && match[1].trim()) {
      existingSections[section] = match[1].trim();
    }
  });

  // If critical sections are missing or empty, mark for reanalysis
  const criticalSections = ['Project Workflow', 'Project Strengths', 'Areas for Improvement'];
  const missingCritical = criticalSections.some(section => !existingSections[section]);

  if (missingCritical) {
    console.log('Critical sections missing, triggering reanalysis');
    return '';  // This will trigger a retry
  }

  // Rebuild the analysis with all sections
  formatted = sections.map(section => {
    const content = existingSections[section] || 'Information not available. Please try analyzing the repository again.';
    return `## ${section}\n${content}\n`;
  }).join('\n');

  // Clean up formatting
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
7. DO NOT skip or leave any section empty
[/INST]</s>`;
}

async function makeAnalysisRequest(prompt: string, attempt: number) {
  try {
    console.log(`Attempting analysis with Mixtral (attempt ${attempt})`);
    
    const response = await axios.post(
      CONFIG.model.url,
      {
        model: CONFIG.model.name,
        messages: [
          {
            role: 'user',
            content: prompt
          }
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

    console.log('Response received:', {
      status: response.status,
      hasData: !!response.data,
      hasChoices: !!response.data?.choices
    });

    if (response.status === 200 && response.data?.choices?.[0]?.message?.content) {
      console.log('Analysis completed successfully');
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
    return `## Project Analysis

This repository does not contain any Python files (.py or .ipynb). Please try analyzing a Python project.`;
  }

  console.log(`Found Python files to analyze. Prompt length: ${prompt.length}`);

  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      const analysis = await makeAnalysisRequest(prompt, attempt);
      
      if (analysis) {
        return `# Python Project Analysis

${analysis}

---
*Analysis performed using Mixtral-8x7B. Covers up to ${CONFIG.maxFiles} Python files, with a maximum of ${CONFIG.maxFileSize} characters per file.*`;
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

  throw new Error('Unable to complete the analysis. Please try again later.');
}
