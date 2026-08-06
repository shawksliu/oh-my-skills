---
name: image-understanding
description: Inspect, describe, OCR, and analyze image files or image URLs through a configurable OpenAI-compatible multimodal API. Use when Codex needs external vision for PNG, JPEG, GIF, WebP, or BMP images; when built-in image reading is unavailable or insufficient; or when the user asks to identify objects, landmarks, documents, screenshots, charts, text, or visual details. The provider and model are selected through environment variables or the skill's own .env file, so this skill is not tied to Qwen or ModelScope.
---

# Image Understanding

Use the bundled Node.js script to send an image and the user's question to the configured multimodal model.

## Workflow

1. Identify the local image path or HTTP(S) image URL.
2. Preserve the user's actual intent in the prompt. If no question is given, ask for a detailed Chinese description.
3. Invoke the script by its absolute Skill path. It does not depend on the user's project directory or a project-level `.env`:

```powershell
node "<skill-directory>\scripts\vision.js" "<image-path>" "<question>"
```

For a network image:

```powershell
node "<skill-directory>\scripts\vision.js" --url "<image-url>" "<question>"
```

4. Treat the model output as evidence, not certainty. Clearly qualify uncertain identities, locations, OCR, or fine visual details.
5. For multiple images, inspect each image separately unless the user's task requires a combined comparison, then synthesize the results.

## Configuration

Use either process environment variables or a `.env` file located directly in this Skill directory. Environment variables take precedence. Never read a `.env` from the user's project directory.

Use provider-neutral variables:

```dotenv
VISION_API_KEY=your-key
VISION_BASE_URL=https://api-inference.modelscope.cn/v1
VISION_MODEL=Qwen/Qwen3.5-397B-A17B
```

The script also accepts the legacy names `DASHSCOPE_API_KEY` and `DASHSCOPE_BASE_URL`, plus `OPENAI_API_KEY` and `OPENAI_BASE_URL`. `VISION_MODEL` is always required.

Optional variables:

```dotenv
VISION_MAX_TOKENS=1024
VISION_TIMEOUT_MS=120000
```

Never print, copy into chat, commit, or embed an API key in the skill. Do not create a secret-bearing `.env` unless the user explicitly asks.

## Error Handling

- Missing configuration: report the missing variable names and show the minimal `.env` shape without a real key.
- HTTP 401/403: ask the user to check the key and endpoint authorization.
- HTTP 402: report provider balance or quota exhaustion and suggest changing account, endpoint, or model.
- Unsupported or oversized local image: convert/compress only if the user permits changing the artifact; otherwise report the limitation.
- Model uncertainty: distinguish visible facts from guesses instead of presenting guesses as confirmed facts.
