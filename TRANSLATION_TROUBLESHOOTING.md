# Translation Troubleshooting Guide

## Problem: Output is not being translated

If you're selecting a language other than English but the output remains in English, one of the following issues may be occurring:

## Quick Diagnostics

### 1. Check if translation dependencies are installed

Run the translation test script:

```bash
cd server
python test_translation.py
```

This will check:
- ✓ If all required packages are installed
- ✓ If the translation service can be imported
- ✓ If translation models can be loaded
- ✓ If actual translation works

### 2. Test the health endpoint

You can test translation status via the API:

```bash
# Check overall health
curl http://localhost:5000/api/health

# Test translation specifically
curl -X POST http://localhost:5000/api/test_translation \
  -H "Content-Type: application/json" \
  -d '{"text": "This is a test", "language": "Hindi"}'
```

Expected response:
```json
{
  "original": "This is a test",
  "translated": "यह एक परीक्षण है",
  "language": "Hindi",
  "success": true,
  "message": "Translation successful"
}
```

If `success` is `false`, see the next section.

## Common Issues & Solutions

### Issue 1: Missing Dependencies

**Error message:**
```
Translation dependencies are missing. Install with:
pip install torch transformers sentencepiece
```

**Solution:**

```bash
cd server
pip install -r requirements.txt
```

This should install all required packages including:
- `torch` - Neural network framework
- `transformers` - Translation models  
- `sentencepiece` - Tokenization

### Issue 2: Models Failing to Download

**Error message:**
```
Failed to load model Helsinki-NLP/opus-mt-en-hi
```

**Causes:**
- No internet connection
- Network timeout
- Slow internet

**Solution:**

```bash
# Manually download a model to cache it
python -c "
from transformers import MarianTokenizer, MarianMTModel
model = MarianMTModel.from_pretrained('Helsinki-NLP/opus-mt-en-hi')
tokenizer = MarianTokenizer.from_pretrained('Helsinki-NLP/opus-mt-en-hi')
print('✓ Model downloaded successfully')
"
```

If this fails, ensure you have internet connectivity.

### Issue 3: Out of Memory (OOM)

**Error message:**
```
CUDA out of memory
RuntimeError: cuda runtime error
```

**Cause:** Your system doesn't have enough RAM for the translation models.

**Solution:**

The code already uses CPU mode by default. Ensure:

1. Close other applications to free up memory
2. Restart the server
3. Check available RAM:
   ```bash
   # Windows
   wmic os get totalvisiblememorymemory
   
   # Linux/Mac
   free -h
   ```

You need at least **4GB** of free RAM for translation models.

### Issue 4: Torch Installation Issues (Windows)

**Error message:**
```
Failed building wheel for torch
```

**Solution:**

```bash
# Uninstall torch
pip uninstall torch

# Install specific PyTorch version
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

### Issue 5: Transformers or Sentencepiece Issues

**Error message:**
```
ModuleNotFoundError: No module named 'transformers'
ModuleNotFoundError: No module named 'sentencepiece'
```

**Solution:**

```bash
pip install --upgrade transformers sentencepiece
```

## Checking Server Logs

The server logs all translation attempts. Look for:

### Successful translation:
```
INFO - Successfully loaded translation model for Hindi
INFO - ✓ QA answer translated to Hindi: 245 → 268 chars
```

### Failed translation (silent fallback):
```
WARNING - ⚠ QA translation to Hindi returned original text
ERROR - Failed to load model bundle for Hindi: [error details]
```

## Supported Languages

The system supports translation to:

- **Hindi** (हिंदी)
- **Telugu** (తెలుగు)
- **Tamil** (தமிழ்)
- **Kannada** (ಕನ್ನಡ)
- **Malayalam** (മലയാളം)
- **Bengali** (বাংলা)
- **Marathi** (मराठी)
- **Gujarati** (ગુજરાતી)
- **Punjabi** (ਪੰਜਾਬੀ)

## Expected Behavior

### First-time translation (SLOW)
The first time you translate:
- Models download from Hugging Face (~1-2 GB total)
- Download may take 2-5 minutes depending on internet
- Server appears unresponsive during download
- **This is normal - wait for it to complete**

Once downloaded, models are cached and subsequent translations are fast.

### Model caching
Models are cached in your system's cache directory:
- **Windows:** `C:\Users\[username]\AppData\Local\huggingface\transformers`
- **Linux:** `~/.cache/huggingface/transformers`
- **macOS:** `~/Library/Caches/huggingface/transformers`

Clear the cache if you have disk space issues.

## Frontend Language Selection

Make sure the frontend is properly passing the language:

1. Language selector should show list of languages
2. Selected language should be sent in API requests
3. Check browser console for errors:
   - Open DevTools (F12)
   - Look for network errors or JavaScript errors
   - Check the API request includes `"language": "Hindi"` etc.

## Example Language Context Usage

In your React component:

```javascript
import { useContext } from "react";
import { LanguageContext } from "../context/LanguageContext";

function MyComponent() {
  const { language, setLanguage } = useContext(LanguageContext);
  
  // This language should be sent to the backend
  console.log("Selected language:", language);
  
  // Make sure API requests include it:
  fetch("/api/upload_summary", {
    method: "POST",
    headers: { "Content-Type": "multipart/form-data" },
    body: formData,
    // Include language in form data
  });
}
```

## Still Having Issues?

1. **Run the test script:**
   ```bash
   cd server
   python test_translation.py
   ```

2. **Check the logs:**
   - Server logs should show detailed error messages
   - Look for `ERROR` or `WARNING` messages containing "translation"

3. **Check environment:**
   ```bash
   python -c "import torch; print(torch.__version__)"
   python -c "import transformers; print(transformers.__version__)"
   ```

4. **Test manually:**
   ```bash
   python -c "
   from services.translation_service import translate_text
   print(translate_text('Hello world', 'Hindi'))
   "
   ```

## Performance Tips

1. **Cold start:** First translation takes 30+ seconds (model loading)
2. **Subsequent requests:** 2-10 seconds per request
3. **Optimize:** 
   - Keep text chunks under 900 characters
   - Batch requests if possible
   - Close other applications consuming RAM

## API Endpoints for Translation

### Test Translation
```http
POST /api/test_translation
Content-Type: application/json

{
  "text": "Your text to translate",
  "language": "Hindi"
}
```

### Check Health
```http
GET /api/health
```

Response includes translation status:
```json
{
  "status": "ok",
  "features": {
    "gemini": true,
    "embeddings": true,
    "database": true,
    "translation": "available"
  }
}
```

## Contact Support

If none of these solutions work:

1. Run `python test_translation.py` and save the output
2. Check server logs for error messages
3. Include these details when reporting the issue:
   - OS (Windows/Linux/macOS)
   - Python version: `python --version`
   - Installed packages: `pip list`
   - Test script output
   - Server logs
