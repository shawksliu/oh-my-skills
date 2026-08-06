---
name: image-understanding
description: Inspect, describe, OCR, and analyze image files or image URLs via a multimodal vision model. Use when Codex needs external vision for PNG, JPEG, GIF, WebP, or BMP images; when built-in image reading is unavailable or insufficient; or when the user asks to identify objects, landmarks, documents, screenshots, charts, text, or visual details.
---

# Image Understanding

## Workflow

1. Identify the local image path or HTTP(S) image URL.
2. Preserve the user's actual intent in the prompt. If no question is given, ask for a detailed Chinese description.
3. Invoke the script by its absolute Skill path:

```powershell
# local image
node "<skill-directory>\scripts\vision.js" "<image-path>" "<question>"
# network image
node "<skill-directory>\scripts\vision.js" --url "<image-url>" "<question>"
```

4. Treat the model output as evidence, not certainty. Clearly qualify uncertain identities, locations, OCR, or fine visual details.
5. Never print, commit, or embed an API key. Do not create a `.env` unless the user explicitly asks.
