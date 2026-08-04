# Oh My Skills

用于管理个人开发和收集的 Agent Skills。仓库同时兼容：

- `npx skills add`：发现并安装单个 `SKILL.md` skill。
- Claude Code marketplace：把每个 skill 作为可独立安装的插件发布。
- Codex：保留标准 `SKILL.md`，并可选提供 `agents/openai.yaml`。

## 目录结构

```text
.
├─ skills/<skill-name>/          # 一个目录对应一个可安装 skill
│  ├─ SKILL.md                   # 通用 Agent Skills 入口
│  ├─ .claude-plugin/plugin.json # 由同步脚本生成
│  ├─ agents/openai.yaml         # 可选，Codex UI 元数据
│  ├─ scripts/                   # 可选，确定性工具
│  ├─ references/                # 可选，按需加载的参考资料
│  └─ assets/                    # 可选，输出资源
├─ .claude-plugin/marketplace.json # 由同步脚本生成
├─ catalog.json                  # marketplace 与来源元数据的唯一数据源
└─ scripts/                      # 创建、注册、同步和校验工具
```

> `skills/` 下保持单层、扁平结构，能同时获得最稳定的 skills CLI 和 Claude Code 兼容性。

## 安装

将仓库上传到 GitHub 后，把下面的 `<github-user>` 替换为你的 GitHub 用户名。

### skills CLI

```bash
# 查看仓库中可安装的 skills
npx skills add <github-user>/oh-my-skills --list

# 交互选择并安装
npx skills add <github-user>/oh-my-skills

# 安装指定 skill
npx skills add <github-user>/oh-my-skills --skill manage-skill-repository
```

### Claude Code marketplace

在 Claude Code 中执行：

```text
/plugin marketplace add <github-user>/oh-my-skills
/plugin install manage-skill-repository@oh-my-skills
```

也可以直接使用完整 GitHub URL 添加 marketplace。

## 开发自己的 skill

```bash
npm run skill:create -- my-skill \
  --description "Describe what the skill does and when it should be used." \
  --display-name "My Skill" \
  --category development \
  --tags automation,workflow
```

然后：

1. 完善 `skills/my-skill/SKILL.md`，删除所有 `TODO`。
2. 按需添加 `scripts/`、`references/`、`assets/` 和 `agents/openai.yaml`。
3. 执行同步和校验。

```bash
npm run marketplace:sync
npm run check
```

## 收集第三方 skill

先确认上游许可允许再分发，并尽量保留原始内容：

1. 将上游 skill 复制到 `skills/<skill-name>/`。
2. 注册来源和许可证：

```bash
npm run skill:register -- <skill-name> \
  --type collected \
  --source https://github.com/owner/repo/tree/main/path/to/skill \
  --license MIT \
  --version 1.0.0
```

3. 执行 `npm run check`。
4. 上游没有明确许可证时，不要直接复制发布；可只记录链接，或先获得作者授权。

## 元数据约定

- `catalog.json` 记录分类、版本、来源和许可证。
- `type: owned` 表示自己维护的 skill。
- `type: collected` 必须同时声明 `source` 和 `license`。
- `.claude-plugin/marketplace.json` 与各 skill 的 `plugin.json` 都是生成文件，不要手工编辑。

## 发布检查

```bash
npm run marketplace:sync
npm run check
git status --short
```

GitHub Actions 会在 push 和 pull request 时重复运行校验。

## License

仓库自有代码使用 MIT License。收集的第三方 skill 仍遵循其各自许可证，详见 `catalog.json`。
