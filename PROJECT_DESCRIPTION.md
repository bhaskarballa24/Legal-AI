# 🤖 Multi-AI Document Analyzer - Full Project Description

## 🌟 Project Overview
The **Multi-AI Document Analyzer** is a sophisticated, full-stack application designed to transform how users interact with their documents. By leveraging cutting-edge Artificial Intelligence and Natural Language Processing (NLP), this system provides a seamless experience for document analysis, summarization, and intelligent questioning, ensuring that all answers are grounded in the provided context to eliminate AI hallucinations.

## ✨ Key Features
- **📄 Multi-Format Document Support**: Seamlessly upload and process PDF, DOCX, and TXT files (up to 64MB).
- **🧠 Intelligent AI Summarization**: Automatically generates concise, accurate summaries of lengthy documents using OpenAI's GPT models.
- **🔍 Semantic Search with Embeddings**: Uses high-dimensional vector embeddings to understand the context and meaning of document content, enabling precise information retrieval.
- **💬 Hallucination-Free Q&A**: A chatbot interface that provides answers derived *only* from the uploaded document. If the information is missing, the AI explicitly states it cannot answer.
- **🛡️ Robust Security & Authentication**: Features a complete user authentication system (Register/Login) backed by MongoDB.
- **📱 Responsive Design**: A modern, mobile-friendly UI built with React and Tailwind CSS for a smooth experience across all devices.

## 🛠️ Technology Stack

### **Frontend**
- **React (v18+)**: Core framework for building a dynamic and responsive user interface.
- **Tailwind CSS**: Utility-first CSS framework for modern, rapid UI development.
- **React Router (v7+)**: Handles client-side routing and navigation.
- **Lucide React**: Provides a library of beautiful, consistent icons.

### **Backend**
- **Python (Flask)**: Lightweight and scalable web framework for the API layer.
- **Flask-CORS**: Enables Cross-Origin Resource Sharing for seamless frontend-backend communication.
- **PyPDF2 & python-docx**: Robust libraries for extracting text from PDF and DOCX files.
- **python-dotenv**: Manages environment variables and API keys securely.

### **Artificial Intelligence & NLP**
- **OpenAI API**: Powers high-level summarization and grounded question-answering.
- **Sentence-Transformers (all-MiniLM-L6-v2)**: Local embedding model for converting text into semantic vectors without external API calls.
- **Numpy**: Used for efficient vector operations and cosine similarity calculations.
- **TF-IDF (Fallback)**: Local summarization engine used when an OpenAI key is not provided.

### **Database & Storage**
- **MongoDB**: NoSQL database for storing user profiles and authentication data.
- **In-Memory Cache**: Documents and their corresponding embeddings are cached with a 2-hour TTL (Time To Live) for high-performance retrieval.

## ⚙️ How It Works: The Pipeline

1.  **Extraction**: The system reads the uploaded file and extracts raw text using format-specific processors.
2.  **Chunking**: Large documents are intelligently split into smaller, overlapping segments (chunks) to preserve context and fit within AI model limits.
3.  **Embedding**: Each chunk is converted into a numerical vector using the `all-MiniLM-L6-v2` model.
4.  **Indexing**: Vectors are stored in an in-memory index for rapid semantic search.
5.  **Retrieval**: When a user asks a question, the system finds the top 5 most relevant chunks using cosine similarity.
6.  **Grounded Q&A**: The relevant chunks + the user's question are sent to OpenAI with strict instructions to answer ONLY from the provided context.

## 🚀 Quick Start & Setup
For detailed setup instructions, please refer to the following guides:
- [SETUP_QUICK_START.md](file:///d:/office%20pro/final%20year%20projects/Multi-Ai-new/Multi-Ai/SETUP_QUICK_START.md) - 5-minute setup and troubleshooting.
- [IMPLEMENTATION_GUIDE.md](file:///d:/office%20pro/final%20year%20projects/Multi-Ai-new/Multi-Ai/IMPLEMENTATION_GUIDE.md) - Deep technical dive and project architecture.

## ✅ Current Implementation Status
- Fully working upload → summarize → embeddings → Q&A pipeline
- Document cache with 2-hour TTL for fast retrieval
- Multilingual summaries and answers (English + Indian languages)
- Authentication: register, login, logout with MongoDB sessions
- Fallbacks when OpenAI or embeddings are unavailable
- Responsive React UI with Tailwind CSS

## 🧩 Frontend Screens
- Landing: overview and CTA to login/register ([LandingPage.js](file:///d:/office%20pro/final%20year%20projects/Multi-Ai-new/Multi-Ai/Frontend/src/pages/LandingPage.js))
- Login/Register: user authentication flow ([LoginPage.js](file:///d:/office%20pro/final%20year%20projects/Multi-Ai-new/Multi-Ai/Frontend/src/pages/LoginPage.js), [RegisterPage.js](file:///d:/office%20pro/final%20year%20projects/Multi-Ai-new/Multi-Ai/Frontend/src/pages/RegisterPage.js))
- Upload: file selection, language choice, server processing ([UploadPage.js](file:///d:/office%20pro/final%20year%20projects/Multi-Ai-new/Multi-Ai/Frontend/src/pages/UploadPage.js))
- Output: summary, detailed analysis, key points, entities ([OutputPage.js](file:///d:/office%20pro/final%20year%20projects/Multi-Ai-new/Multi-Ai/Frontend/src/pages/OutputPage.js))
- Chatbot: ask follow-up questions using document-aware context ([ChatbotPage.js](file:///d:/office%20pro/final%20year%20projects/Multi-Ai-new/Multi-Ai/Frontend/src/pages/ChatbotPage.js), [ChatbotWidget.js](file:///d:/office%20pro/final%20year%20projects/Multi-Ai-new/Multi-Ai/Frontend/src/components/ChatbotWidget.js))

## 🔗 API Endpoints
- POST /api/upload_summary: upload file, get summary + documentId ([server/app.py](file:///d:/office%20pro/final%20year%20projects/Multi-Ai-new/Multi-Ai/server/app.py#L887-L996))
- POST /api/ask: question answering using embeddings-grounded context ([server/app.py](file:///d:/office%20pro/final%20year%20projects/Multi-Ai-new/Multi-Ai/server/app.py#L1004-L1150))
- GET /api/document/:doc_id: document metadata (chunks, embedding status) ([server/app.py](file:///d:/office%20pro/final%20year%20projects/Multi-Ai-new/Multi-Ai/server/app.py#L1149-L1168))
- Auth: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me, POST /api/auth/logout ([server/app.py](file:///d:/office%20pro/final%20year%20projects/Multi-Ai-new/Multi-Ai/server/app.py#L1200-L1309))
- GET /api/key_status: check OpenAI availability ([server/app.py](file:///d:/office%20pro/final%20year%20projects/Multi-Ai-new/Multi-Ai/server/app.py#L1310-L1313))

## 🔐 Security & Data Handling
- Max upload size configurable via env (default 64MB)
- Bearer token sessions stored in memory with cleanup
- MongoDB used for users and optional document history
- No external data leaves system except optional OpenAI calls
- Strict prompts to avoid hallucinations; zero temperature for factual answers

## 🧭 Architecture Summary
- Extraction → Chunking → Embeddings → Retrieval → Grounded Q&A
- Embedding model: all-MiniLM-L6-v2 (local, no API required)
- Cosine similarity to select top-K relevant chunks
- Smart fallbacks when dependencies are missing

## 🔮 Future Enhancements
- **Multi-Document Analysis**: Ask questions across multiple uploaded documents simultaneously.
- **OCR Support**: Extract text from scanned images and handwritten documents.
- **Cloud Vector Databases**: Integration with Pinecone or Milvus for persistent, long-term document storage.
- **Expanded Model Support**: Support for local LLMs like Llama 3 or Mistral for full offline capability.

---
*Created for the Final Year Project: Multi-AI Document Analyzer.*
