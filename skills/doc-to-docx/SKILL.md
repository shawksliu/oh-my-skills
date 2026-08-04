---
name: doc-to-docx
description: 将 .doc 与 .wps 格式文档转换为 .docx 格式文档的转换工具。优先调用 WPS/Word COM 接口，跨平台或无 Office 环境下自动降级调用 LibreOffice。当用户需要将 .doc/.wps 转化为 .docx、批量转换旧版 Word/WPS 文档格式时使用此技能。
---

# doc-to-docx — DOC / WPS 转 DOCX 格式转换工具

使用 `scripts/doc_to_docx.py` 脚本，将旧版 `.doc` 和 `.wps` 格式文档无损转换为标准 `.docx` 格式。

## 环境与依赖准备

依赖 Python 库 `python-docx` 与 `pywin32`（Windows COM）：

```bash
uv pip install python-docx pywin32
```
或直接通过 `requirements.txt` 安装：
```bash
uv pip install -r requirements.txt
```

## 核心功能

- **多格式支持**：全面支持旧版 `.doc` 及 WPS 专属 `.wps` 格式文档转换。
- **双转换驱动引擎**：
  - **COM 引擎（优先）**：Windows 环境下自动识别并连接 WPS (`KWPS.Application`/`WPS.Application`) 或 MS Word (`Word.Application`)。
  - **LibreOffice 降级引擎**：在 Linux/macOS 或 Windows 无 COM 环境下，自动查找并调用 LibreOffice (`soffice`) 进行后台无缝转换。
- **单文件与批量处理**：指定单个 `.doc`/`.wps` 文件或全目录扫描批量转换。
- **格式有效性校验**：转换后使用 `python-docx` 验证生成的 `.docx`，确保输出文件合法完整。

## 使用方法与示例

### 1. 转换单个 .doc / .wps 文件
```bash
uv run python scripts/doc_to_docx.py -i "C:/path/to/document.wps"
```
转换后将在同一目录下生成同名的 `document.docx`。

显式指定输出路径：
```bash
uv run python scripts/doc_to_docx.py -i "C:/path/to/document.wps" -o "C:/path/to/output.docx"
```

### 2. 批量转换目录中的所有 .doc 与 .wps 文件
```bash
uv run python scripts/doc_to_docx.py -i "C:/path/to/input_dir" -o "C:/path/to/output_dir"
```

### 3. 指定 LibreOffice 路径（可选）
当系统未将 LibreOffice 加入 PATH 且处于非 COM 环境时，可通过 `--soffice` 参数显式指定：
```bash
uv run python scripts/doc_to_docx.py -i "document.wps" --soffice "C:/Program Files/LibreOffice/program/soffice.exe"
```

## 注意事项

- 在 Windows 环境下优先启动 WPS 或 Word 的 COM 接口，转换效率高且完美保留版面。
- 转换完成后会通过 `python-docx` 校验生成的 `.docx` 是否能被正常读取解析。
