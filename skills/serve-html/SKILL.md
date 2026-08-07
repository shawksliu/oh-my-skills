---
name: serve-html
description: 通过 HTTP 在本地访问 HTML 页面。当需要预览 HTML 文件、测试静态站点、或避免 file:// 协议限制时使用。
license: MIT
---

# Serve HTML

用 `npx http-server` 启动本地 HTTP 服务，通过浏览器访问指定 HTML 页面。

## 步骤

1. 在目标目录启动服务：
   ```bash
   npx http-server . -c-1 -o -p 8080
   ```
   - `-c-1`：禁用缓存
   - `-o`：自动打开浏览器
   - `-p 8080`：端口（冲突时换 3000 / 8000）

2. 访问特定页面：
   ```
   http://localhost:8080/filename.html
   ```

3. 完成后按 `Ctrl+C` 停止。

## 需要 CORS 时

```bash
npx http-server . -c-1 --cors -p 8080
```
