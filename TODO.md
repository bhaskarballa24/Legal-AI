# TODO - Update to new Google GenAI SDK

## Task
Update project from `google-generativeai` to `google-genai` SDK and use supported model `gemini-1.5-flash-latest`

## Steps
- [ ] 1. Update server/requirements.txt - Replace google-generativeai with google-genai
- [ ] 2. Update server/models/gemini_client.py - New SDK import and client initialization
- [ ] 3. Update server/services/summarization_service.py - Use new client.generate_text() API
- [ ] 4. Update server/services/simplification_service.py - Use new client.generate_text() API
- [ ] 5. Update server/services/translation_service.py - Use new client.generate_text() API
- [ ] 6. Update server/services/qa_service.py - Use new client.generate_text() API

## Post-Installation Steps (to run in terminal)
```bash
pip uninstall google-generativeai
pip install google-genai
```

