# Contributing

## 添加或修改 skill

1. 保持 skill 位于 `skills/<kebab-case-name>/`。
2. `SKILL.md` frontmatter 只保留 `name` 和 `description`。
3. 在 `catalog.json` 中登记版本、许可证和来源类型。
4. 运行 `npm run marketplace:sync` 和 `npm run check`。
5. 提交生成后的 `.claude-plugin/*.json`。

## 收集第三方内容

- 必须记录可访问的上游 URL。
- 必须确认许可证允许复制和再分发。
- 优先保持上游目录和内容不变，仅添加本仓库所需的兼容元数据。
- 更新时同时调整 `catalog.json` 中的版本和来源信息。
