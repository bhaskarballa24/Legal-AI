# 🔧 QUICK FIX: Translation Not Working

## Problem
Output stays in English instead of translating to your selected language (Hindi, Telugu, Tamil, etc.)

## ⚡ Quick Fix (3 steps, 2 minutes)

### Step 1: Install Dependencies
```bash
cd server
pip install -r requirements.txt
```
This installs: torch, transformers, sentencepiece

### Step 2: Verify Installation
```bash
python test_translation.py
```
- ✓ All checks pass → Translation is working
- ✗ Errors → Check TRANSLATION_TROUBLESHOOTING.md

### Step 3: Restart Server
```bash
python app.py
```
Now try translating again!

---

## 🧪 Verify It's Working

### Test via Terminal
```bash
curl -X POST http://localhost:5000/api/test_translation \
  -H "Content-Type: application/json" \
  -d '{"text": "This is a test", "language": "Hindi"}'
```

Should return Hindi translation, not the original English.

### Test via Browser
1. Open http://localhost:3000
2. Upload a document
3. Select "Hindi" (or other language)
4. View output - should be translated

---

## 🔍 Check Server Logs

If step 2 fails, check server logs for:

**✓ Good signs:**
```
Successfully loaded translation model for Hindi
✓ QA answer translated to Hindi: 245 → 268 chars
```

**✗ Problem signs:**
```
ERROR: Translation dependencies missing
ERROR: Failed to load model
⚠ Translation returned original text
```

---

## 📚 Full Guide

Need more help? Read: **TRANSLATION_TROUBLESHOOTING.md**

---

## ⚙️ What Was Fixed

✅ Better error logging so you know exactly what's wrong  
✅ Test endpoint to verify translation works  
✅ Health check endpoint with translation status  
✅ Diagnostic script to check dependencies  
✅ Comprehensive troubleshooting guide  

---

**Still stuck?** 
→ Run `python server/test_translation.py` and check the output
→ Read `TRANSLATION_TROUBLESHOOTING.md` for detailed solutions
