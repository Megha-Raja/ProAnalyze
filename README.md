ProAnalyze
AI-Powered GitHub Repository Analyzer
Overview
ProAnalyze is an AI-driven tool that simplifies the understanding of GitHub repositories by analyzing Python files and generating structured insights. It helps developers, students, and researchers gain a clear understanding of a project's functionality, structure, and complexity, even in the absence of a README file.

Features
✔ Fetches repositories using the GitHub API
✔ Analyzes .py and .ipynb files to extract meaningful insights
✔ Provides a detailed project summary, including:

Purpose and functionality
Features and key components
Technologies, frameworks, and libraries used
Workflow and complexity analysis
✔ Generates workflow diagrams for better visualization
✔ Uses Mixtral-7B, a Large Language Model (LLM), for AI-powered analysis
Problem Statement
Developers often struggle to understand a project's purpose and structure when documentation is missing or incomplete. This limits their ability to contribute, optimize, or innovate within the project. Similarly, students and researchers find it difficult to explore technologies and methodologies used in existing repositories. ProAnalyze solves this issue by automating repository analysis and delivering meaningful insights.

Technologies Used
Programming Languages: Python
AI Model: Mixtral-7B (for NLP-based code analysis and summarization)
APIs: GitHub API
Visualization: Workflow diagram generation
Installation & Usage
Prerequisites
Python 3.x installed
GitHub API access token
Together AI API key for Mixtral-7B
Required Python libraries (install using pip install -r requirements.txt)
Installation Steps
Clone the repository:
bash
Copy
Edit
git clone https://github.com/your-username/ProAnalyze.git
cd ProAnalyze
Install dependencies:
bash
Copy
Edit
pip install -r requirements.txt
Set up API keys in .env file:
env
Copy
Edit
GITHUB_API_KEY=your_github_token
TOGETHER_AI_KEY=your_together_ai_token
Run the analysis tool:
bash
Copy
Edit
python main.py
How It Works
The user provides a GitHub repository URL.
ProAnalyze fetches and scans the repository, extracting relevant Python files.
The Mixtral-7B model processes the code to generate structured insights.
The tool creates workflow diagrams for visual representation.
The results are displayed, offering an overview of the project’s purpose, features, technologies, and complexity.
