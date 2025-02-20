import axios from 'axios';

// Configuration
const CONFIG = {
  model: {
    url: 'https://api.together.xyz/v1/chat/completions',
    name: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    maxTokens: 2048
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
    'Code Structure',
    'Implementation Details',
    'Complexity & Maintainability'
  ];

  let formatted = analysis.trim();

  // Remove any potential system or assistant markers
  formatted = formatted.replace(/^(system|assistant|user):\s*/gmi, '').trim();

  // Ensure proper section headers
  sections.forEach(section => {
    if (!formatted.includes(`## ${section}`)) {
      formatted += `\n\n## ${section}\nNo information available.`;
    }
  });

  // Clean up formatting
  return formatted
    .split('\n')
    .filter((line, index, arr) => {
      if (index > 0 && line === arr[index - 1]) return false;
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
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

  return `<s>[INST] You are a code analysis expert. Analyze these Python files and provide a detailed technical summary.

Files to analyze:

${filesSummary}

Provide your analysis in this exact markdown format:

## Project Overview
[Describe the main purpose and goals of the project]

## Key Features
[List and describe the main functionality]

## Libraries & Dependencies
[List the key Python libraries and dependencies used]

## Code Structure
[Explain how the code is organized]

## Implementation Details
[Describe notable implementation patterns and techniques]

## Complexity & Maintainability
[Assess code complexity and maintainability]

Be specific and technical in your analysis. Focus on code patterns, architecture, and implementation details. [/INST]</s>`;
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

      return formatAnalysis(analysis);
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