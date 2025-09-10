# 🧠 ProAnalyze: AI-Powered GitHub Repository Analyzer
ProAnalyze is an intelligent analysis tool that leverages large language models to understand and visualize the structure and functionality of public Python repositories on GitHub. It helps users, especially beginners and developers exploring open-source projects, to quickly grasp the essence of any repository—even in the absence of a README.

## 📌 Purpose
The primary goal of ProAnalyze is to simplify the process of understanding GitHub projects by automating code analysis using AI. Instead of spending hours reading source files, users can view a summarized version of the project’s purpose, features, technologies used, implementation logic, and even its workflow in a visual format.

## ✨ Key Features
**🔍 AI-Powered Project Analysis**
Uses the Mixtral 8x7B model served via Ollama to analyze .py and .ipynb files.
Extracts insights such as overview, features, technologies used, implementation details, and areas of improvement.

**📂 Python-Centric Repository Parsing**
Automatically filters and selects .py and .ipynb files.
Ignores non-essential files like docs, configs, or media to focus on core logic.

**📊 Workflow Visualization**
Generates clean workflow diagrams using Graphviz to visually represent how the project functions.
Helpful for visual learners and newcomers to complex codebases.

**🌐 GitHub Integration**
Accepts any GitHub repository URL as input.
Fetches files directly for analysis.

**📄 License Detection**
Automatically detects the repository’s license (if present) to inform users about usage rights.

## 🛠️ Technologies Used
- Frontend: TypeScript

- Backend AI Serving: Together AI (Mixtral 8x7B)

- Diagram Visualization: Graphviz

- LLM-Based Analysis: Custom prompt engineering for consistent field-wise responses

## 📈 Fields Generated in Analysis
Each analyzed repository includes the following insights:

**Overview:** A summary of what the project does

**Features:** Highlighted functionalities

**Technologies:** Tools, libraries, and frameworks used

**Implementation details:** Step-by-step explanation of how the code works

**Workflow:** Graphviz-based flow diagram representation

**Strengths:** What the project does well

**Areas of improvement:** Suggestions for enhancement


## 🧩 Use Cases
🚀 Students exploring open-source projects for learning

🛠️ Developers trying to contribute to a new repo

📊 Project reviewers looking for a quick code overview

🧪 Hackathon teams doing rapid codebase audits
