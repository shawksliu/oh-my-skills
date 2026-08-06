#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

function loadEnvFile(file) {
  if (!file) return;
  try {
    const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const normalized = line.startsWith("export ") ? line.slice(7).trim() : line;
      const eq = normalized.indexOf("=");
      if (eq < 1) continue;
      const key = normalized.slice(0, eq).trim();
      let value = normalized.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

const skillDir = path.resolve(__dirname, "..");
const envCandidates = [
  path.join(skillDir, ".env"),
];
for (const file of [...new Set(envCandidates.filter(Boolean))]) loadEnvFile(file);

function firstDefined(...values) {
  return values.find((value) => typeof value === "string" && value.trim() !== "")?.trim();
}

const config = {
  apiKey: firstDefined(
    process.env.VISION_API_KEY,
    process.env.DASHSCOPE_API_KEY,
    process.env.OPENAI_API_KEY,
  ),
  baseUrl: firstDefined(
    process.env.VISION_BASE_URL,
    process.env.DASHSCOPE_BASE_URL,
    process.env.OPENAI_BASE_URL,
  ),
  model: firstDefined(process.env.VISION_MODEL),
  maxTokens: Number.parseInt(process.env.VISION_MAX_TOKENS || "1024", 10),
  timeoutMs: Number.parseInt(process.env.VISION_TIMEOUT_MS || "120000", 10),
};

function parseArgs(argv) {
  let imageSource = "";
  let isUrl = false;
  const promptParts = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--url") {
      if (!argv[i + 1]) throw new Error("--url 后缺少图片链接");
      isUrl = true;
      imageSource = argv[++i];
    } else if (arg === "--help" || arg === "-h") {
      return { help: true };
    } else if (!imageSource && !arg.startsWith("--")) {
      imageSource = arg;
    } else {
      promptParts.push(arg);
    }
  }

  return {
    help: false,
    imageSource,
    isUrl,
    prompt: promptParts.join(" ").trim() || "请详细描述这张图片的内容。",
  };
}

function printUsage() {
  console.error("用法:");
  console.error('  node vision.js "<图片路径>" [问题]');
  console.error('  node vision.js --url "<图片链接>" [问题]');
}

function validateConfig() {
  const missing = [];
  if (!config.apiKey) missing.push("VISION_API_KEY");
  if (!config.baseUrl) missing.push("VISION_BASE_URL");
  if (!config.model) missing.push("VISION_MODEL");
  if (missing.length) {
    throw new Error(`缺少配置: ${missing.join(", ")}。请在环境变量或 Skill 目录的 .env 中设置。`);
  }
  if (!Number.isFinite(config.maxTokens) || config.maxTokens <= 0) {
    throw new Error("VISION_MAX_TOKENS 必须是正整数");
  }
  if (!Number.isFinite(config.timeoutMs) || config.timeoutMs <= 0) {
    throw new Error("VISION_TIMEOUT_MS 必须是正整数");
  }
}

function imageToUrl(source, isUrl) {
  if (isUrl) {
    const parsed = new URL(source);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("图片 URL 必须使用 http 或 https");
    }
    return source;
  }

  const resolved = path.resolve(source);
  if (!fs.existsSync(resolved)) throw new Error(`文件不存在: ${resolved}`);
  if (!fs.statSync(resolved).isFile()) throw new Error(`不是文件: ${resolved}`);

  const ext = path.extname(resolved).toLowerCase();
  const mimeTypes = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
  };
  const mime = mimeTypes[ext];
  if (!mime) throw new Error(`不支持的图片格式: ${ext || "无扩展名"}`);

  const data = fs.readFileSync(resolved).toString("base64");
  return `data:${mime};base64,${data}`;
}

function completionEndpoint(baseUrl) {
  const normalized = baseUrl.replace(/\/+$/, "");
  return new URL(normalized.endsWith("/chat/completions")
    ? normalized
    : `${normalized}/chat/completions`);
}

function extractContent(response) {
  const content = response?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => typeof item === "string" ? item : item?.text || "")
      .filter(Boolean)
      .join("\n");
  }
  return JSON.stringify(response, null, 2);
}

function requestCompletion(payload) {
  const url = completionEndpoint(config.baseUrl);
  const body = JSON.stringify(payload);
  const transport = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const req = transport.request(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
      timeout: config.timeoutMs,
    }, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = null; }
        if ((res.statusCode || 500) >= 400) {
          const detail = parsed?.error?.message || parsed?.message || data.slice(0, 500);
          reject(new Error(`API ${res.statusCode}: ${detail}`));
          return;
        }
        if (!parsed) {
          reject(new Error("API 返回了非 JSON 响应"));
          return;
        }
        resolve(extractContent(parsed));
      });
    });

    req.on("timeout", () => req.destroy(new Error(`请求超时（${config.timeoutMs} ms）`)));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      printUsage();
      return;
    }
    if (!args.imageSource) {
      printUsage();
      process.exitCode = 1;
      return;
    }

    validateConfig();
    const imageUrl = imageToUrl(args.imageSource, args.isUrl);
    const result = await requestCompletion({
      model: config.model,
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageUrl } },
          { type: "text", text: args.prompt },
        ],
      }],
      stream: false,
      max_tokens: config.maxTokens,
    });
    console.log(result);
  } catch (error) {
    console.error(`识图失败: ${error.message}`);
    process.exitCode = 1;
  }
}

main();



