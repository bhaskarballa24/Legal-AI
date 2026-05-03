# Chatbot Setup Guide

## Issues Fixed ✅

1. **OpenAI API Key Not Loading** - The OPENAI_KEY was hardcoded as an empty string and never loaded from environment variables
2. **Chatbot Endpoint Error** - Fixed the `/api/ask` route to handle requests without documents
3. **Missing Error Handling** - Improved error messages and logging

## How to Make the Chatbot Work

You have two options:

### Option 1: Use OpenAI (Recommended for simplicity)

1. Get an OpenAI API key from: https://platform.openai.com/api-keys
2. Create a `.env` file in the `server` folder with:
   ```
   OPENAI_API_KEY=sk-your-key-here
   ```
3. Restart the server: `python server/app.py`
4. The chatbot will now use OpenAI's GPT-3.5-turbo model

### Option 2: Use Ollama (Free, runs locally)

1. Download Ollama from: https://ollama.ai
2. Install and run Ollama
3. Download a model (e.g., Mistral): `ollama pull mistral`
4. Make sure Ollama is running on `http://localhost:11434`
5. Create a `.env` file in the `server` folder with:
   ```
   OLLAMA_API_URL=http://localhost:11434/api/generate
   OLLAMA_MODEL=mistral
   ```
6. Restart the server: `python server/app.py`

## Running the Application

### Backend (API Server)
```bash
cd server
pip install -r requirements.txt
python app.py
```
Server will run on: `http://127.0.0.1:5000`

### Frontend (React App)
```bash
cd Frontend
npm install
npm start
```
Frontend will run on: `http://localhost:3000`

## How It Works

1. Upload a document (PDF, DOCX, TXT)
2. The chatbot extracts text from the document
3. Ask questions about the document or chat generally
4. The AI model answers based on the document context

## API Endpoints

- `POST /api/ask` - Ask a question about a document
  - Request: `{"question": "...", "document": "...", "language": "English"}`
  - Response: `{"answer": "..."}`

- `POST /api/upload_summary` - Upload and summarize a document
  - Request: Form data with file
  - Response: `{"summary": "...", "text": "..."}`

- `GET /api/health` - Check if server is running
  - Response: `{"status": "ok"}`

- `GET /api/key_status` - Check if OpenAI key is configured
  - Response: `{"has_key": true/false}`

## Troubleshooting

**Error: "Ollama Error: Max retries exceeded"**
- Make sure Ollama is installed and running
- Check that `OLLAMA_API_URL` is correct
- Run `ollama serve` in another terminal

**Error: "OpenAI Error"**
- Make sure your OpenAI API key is valid
- Check that `OPENAI_API_KEY` is set in `.env`
- Your API key needs credits/balance

**CORS Issues**
- CORS is already configured on the backend
- Make sure frontend connects to correct backend URL

**Port Already in Use**
- Change port in `server/app.py`: `app.run(port=5001)`
- Update frontend URL accordingly
