---
name: markitdown
description: Use when needing to convert files (PDF, DOCX, PPTX, XLSX, HTML, images, audio, EPUB, ZIP, YouTube URLs) to Markdown for LLM consumption or text analysis. Use when user mentions "markitdown", "convert to markdown", "extract text from document", or needs to read binary/office file contents.
---

# markitdown

## Overview

Microsoft 的 MarkItDown 工具，将 PDF/Word/PowerPoint/Excel/HTML/图片/音频/EPUB/ZIP/YouTube 等格式转换为 Markdown。输出保留标题、列表、表格、链接等结构，适合 LLM 消费。

## When to Use

- 需要读取二进制文件内容（PDF、DOCX、PPTX、XLSX）
- 需要提取文档文本供 LLM 分析
- 需要将非文本格式转为 Markdown
- 需要批量处理 ZIP 内的多个文件

## Quick Reference

### 运行命令

```bash
# 基本用法（输出到 stdout）
uvx --from "markitdown[all]" markitdown <文件路径>

# 输出到文件
uvx --from "markitdown[all]" markitdown input.pdf -o output.md

# 管道输入
cat input.pdf | uvx --from "markitdown[all]" markitdown

# 从 stdin 读取时指定文件类型
uvx --from "markitdown[all]" markitdown -x pdf < input.bin
```

### CLI Flags

| Flag | 说明 |
|------|------|
| `-o OUTPUT` | 输出文件路径（默认 stdout） |
| `-x EXTENSION` | 文件扩展名提示（stdin 时有用，如 `-x pdf`） |
| `-m MIME_TYPE` | MIME 类型提示 |
| `-c CHARSET` | 字符编码提示（如 UTF-8） |
| `-d` | 使用 Azure Document Intelligence（需配合 `-e`） |
| `-e ENDPOINT` | Document Intelligence 端点 URL |
| `-p` | 启用第三方插件 |
| `--list-plugins` | 列出已安装插件 |
| `--keep-data-uris` | 保留 base64 图片（默认截断） |
| `-v, --version` | 显示版本号 |

### 支持的文件格式

| 格式 | 扩展名 | 说明 |
|------|--------|------|
| PDF | `.pdf` | 文本提取（需 `[pdf]` 或 `[all]`） |
| Word | `.docx` | 需 `[docx]` 或 `[all]` |
| PowerPoint | `.pptx` | 需 `[pptx]` 或 `[all]` |
| Excel | `.xlsx` | 需 `[xlsx]` 或 `[all]` |
| 旧版 Excel | `.xls` | 需 `[xls]` 或 `[all]` |
| HTML | `.html`, `.htm` | 内置支持 |
| 图片 | `.jpg`, `.png` 等 | EXIF 元数据 + OCR |
| 音频 | `.wav`, `.mp3` | EXIF + 语音转文字（需 `[audio-transcription]`） |
| Outlook | `.msg` | 需 `[outlook]` 或 `[all]` |
| EPUB | `.epub` | 内置支持 |
| ZIP | `.zip` | 遍历内容逐个转换 |
| YouTube | URL | 需 `[youtube-transcription]` |
| CSV/JSON/XML | 各自扩展名 | 文本格式，内置支持 |

### 选择性安装（减少依赖）

```bash
# 只安装特定格式的依赖
uvx --from "markitdown[pdf,docx,pptx]" markitdown input.pdf

# 完整安装
uvx --from "markitdown[all]" markitdown input.pdf
```

## Common Mistakes

- **忘记 `[all]`**：`uvx markitdown` 不带 extras 会缺少格式依赖，PDF/DOCX/PPTX 等无法处理
- **用 `uvx markitdown[all]` 而非 `--from`**：正确语法是 `uvx --from "markitdown[all]" markitdown`
- **音频转文字缺 ffmpeg**：音频功能需要系统安装 ffmpeg
- **PDF 图片内容丢失**：markitdown 提取文本，不保证图片内容；需 OCR 可用 `markitdown-ocr` 插件 + LLM client
