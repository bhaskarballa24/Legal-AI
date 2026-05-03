# Quick Start Guide - Multi-AI Document Analyzer

## Prerequisites
- Python 3.8+
- Node.js 14+ (with npm)
- MongoDB 5.0+ (optional, for authentication)

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Backend Setup

```bash
# Navigate to server directory
cd server

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Step 2: Configure Backend

```bash
# Copy environment template
cp .env.example .env

# Edit .env file and add your OpenAI API key
# nano .env  (or use your editor)
# Add: OPENAI_API_KEY=sk-your-key-here

# (Optional) Configure MongoDB if you want user authentication
# Edit MONGODB_URI and MONGODB_DB_NAME
```

### Step 3: Start Backend

```bash
# Make sure venv is activated
python app.py

# You should see:
# Starting Multi-AI Document Backend
# Starting server on 0.0.0.0:5000
```

Backend is now running at `http://localhost:5000`

---

### Step 4: Frontend Setup (New Terminal)

```bash
# Navigate to frontend directory
cd Frontend

# Install dependencies
npm install

# Create .env file
echo "REACT_APP_API_BASE=http://localhost:5000" > .env

# Start development server
npm start

# Browser will open at http://localhost:3000
```

---

## ✅ Verify Setup

### Test Backend
```bash
# In another terminal, test API
curl http://localhost:5000/api/health

# Expected response:
# {"status":"ok","features":{"openai":true,"embeddings":true,"database":false}}
```

### Test Frontend
- Open http://localhost:3000
- You should see login page
- Other pages only accessible after login

---

## 🧪 Test Full Pipeline

1. **Register/Login**
   - Click "Register" on login page
   - Create test account (name, email, password)
   - You'll be logged in automatically

2. **Upload Document**
   - Click "Upload" button
   - Select a PDF, DOCX, or TXT file
   - Choose language (English, Spanish, etc.)
   - Click "Analyze Document"
   - Wait for summary to appear

3. **Test Chatbot**
   - Scroll down to "Ask Follow-up Questions"
   - Type: "What is the main topic of this document?"
   - Click Send
   - AI should answer based on the document

4. **Verify Embedding Retrieval** (check console logs)
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for backend logs (in terminal) showing:
     - "Generating embeddings..."
     - "Retrieved X relevant chunks..."

---

## 📁 Project Structure

```
Multi-Ai/
├── server/                    # Python Flask backend
│   ├── app.py                # Main backend code (1200+ lines, well-commented)
│   ├── requirements.txt       # Python dependencies
│   ├── .env.example          # Configuration template
│   └── app_backup.py         # Original version (for reference)
│
├── Frontend/                  # React frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.js       # User authentication
│   │   │   ├── RegisterPage.js    # Account creation
│   │   │   ├── UploadPage.js      # File upload & summary
│   │   │   ├── OutputPage.js      # Display results & chatbot
│   │   │   ├── ChatbotPage.js     # Full-screen chat interface
│   │   │   └── ...
│   │   ├── components/
│   │   │   └── ChatbotWidget.js   # Floating chat widget
│   │   ├── utils/
│   │   │   └── auth.js            # Auth utilities
│   │   └── App.js                 # Routing
│   ├── package.json               # Dependencies
│   ├── .env                       # API base URL
│   └── public/index.html
│
├── IMPLEMENTATION_GUIDE.md   # Deep technical guide (with demo script)
├── SETUP_GUIDE.md            # Quick start (this file)
├── FIXES_SUMMARY.md          # What was fixed in this session
└── START.bat                 # Windows startup script
```

---

## 🔧 Configuration

### Backend (.env file)

```env
# Required: Your OpenAI API key
OPENAI_API_KEY=sk-your-actual-key

# Optional: Database for user auth
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=multi-ai
MONGODB_TIMEOUT_MS=3000

# Optional: Tuning
MAX_CONTENT_LENGTH_MB=64         # Max file size
DOC_TTL_SECONDS=7200             # Document cache time (2 hours)
```

### Frontend (.env file)

```env
# Backend API URL (must match where Flask is running)
REACT_APP_API_BASE=http://localhost:5000
```

---

## 🌐 Accessing the Application

### Local Development
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Test Health**: http://localhost:5000/api/health

### After Login, Available Routes
- `/upload` - Upload documents
- `/output` - View summary & ask questions
- `/chatbot` - Full-screen chat interface

---

## 🐛 Troubleshooting

### Python Virtual Environment Issues

```bash
# If pip install fails, try updating pip:
python -m pip install --upgrade pip

# If venv activation fails on Windows:
python -m venv venv
.\venv\Scripts\activate  # Note the backslash

# If dependencies fail to install:
pip install --no-cache-dir -r requirements.txt
```

### Node/NPM Issues

```bash
# Clear npm cache if install fails:
npm cache clean --force
npm install

# If node_modules corrupted:
rm -rf node_modules package-lock.json
npm install
```

### Backend Port Already in Use

```bash
# Change port in app.py (last line):
# app.run(host="0.0.0.0", port=5001, debug=True)  # Use 5001 instead

# Then update Frontend .env:
# REACT_APP_API_BASE=http://localhost:5001
```

### CORS Errors

- Backend already has CORS enabled for all origins
- If still getting errors, check that:
  - Backend is running on correct port
  - Frontend .env has correct REACT_APP_API_BASE
  - No typos in API calls

### "ModuleNotFoundError: No module named 'sentence_transformers'"

```bash
# Activate venv first, then:
pip install sentence-transformers

# This may take 2-3 minutes to download large models
```

### Documents "Not Found" After Server Restart

- **Normal behavior**: Documents are stored in memory
- They're cleared when server restarts
- For persistent storage, add database/Redis (see IMPLEMENTATION_GUIDE)

---

## 📊 Where to Find Things

| Feature | File | Lines | Description |
|---------|------|-------|-------------|
| **Document Upload** | server/app.py | 650-750 | `/api/upload_summary` endpoint |
| **File Extraction** | server/app.py | 280-380 | `extract_text_from_file()` |
| **Embedding Generation** | server/app.py | 410-430 | `_generate_embeddings()` |
| **Semantic Search** | server/app.py | 440-480 | `_retrieve_relevant_chunks()` |
| **Question Answer** | server/app.py | 530-590 | `/api/ask` endpoint & `answer_question_with_context()` |
| **Frontend Upload** | Frontend/src/pages/UploadPage.js | 50-85 | `handleSubmit()` |
| **Frontend Chat** | Frontend/src/components/ChatbotWidget.js | 30-75 | `sendMessage()` |
| **Routing** | Frontend/src/App.js | - | All page routes |

---

## 📚 Code Comments

Every major function in app.py has:
- **Docstring**: What it does and why
- **Inline Comments**: Explaining complex logic
- **Variable Names**: Self-documenting code

Read through app.py for deep understanding!

---

## 🚢 Production Deployment

For going beyond localhost:

### Backend Deployment
1. Use gunicorn instead of debugger:
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```

2. Set `debug=False` and `FLASK_ENV=production`

3. Use proper database (PostgreSQL recommended)

4. Add reverse proxy (Nginx)

5. Use SSL certificates (Let's Encrypt)

### Frontend Deployment
1. Build for production:
   ```bash
   npm run build
   ```

2. Deploy `build/` folder to static hosting (Vercel, Netlify, AWS S3)

3. Configure API endpoint to production backend

---

## 📞 Support

- **Backend Issues**: Check server console logs (terminal where you ran `python app.py`)
- **Frontend Issues**: Check browser console (F12 → Console tab)
- **API Communication**: Use Network tab in browser DevTools (F12 → Network)

---

## Next Steps

1. Read **IMPLEMENTATION_GUIDE.md** for deep technical understanding
2. Run through **Test Full Pipeline** section above
3. Modify prompts in `call_openai_answer()` to match your use case
4. Add custom document types (Excel, PowerPoint)
5. Deploy to production

---

## 🎉 You're All Set!

The system is now ready for:
- ✅ Uploading documents
- ✅ Generating summaries
- ✅ Asking questions grounded in document content
- ✅ Preventing AI hallucination through embeddings

Enjoy building! 🚀
