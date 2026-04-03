# kb-agent

CLI 知识管理工具 — 将零散信息源编译为结构化、可查询、可关联的知识 wiki。

灵感来自 [Andrej Karpathy 的 LLM Wiki 工作流](https://x.com/karpathy/status/1899553330709086473)，将其"一堆拼凑的脚本"工程化为 agent + skill 架构。

## 工作原理

```
原始资料 → Markdown 提取 → Wiki 知识库 → 问答/对话
  (URL/文本)    (统一格式)     (LLM 编译)    (LLM 检索)
```

kb-agent 通过四级数据管线处理知识：

1. **导入** — 将 URL 或文本转为统一的 Markdown 格式
2. **编译** — LLM 自动生成摘要、提炼概念、构建知识地图
3. **查询** — 通过分层索引导航，自然语言问答
4. **维护** — 自动发现矛盾、缺口、断链并修复

产出的 `wiki/` 目录是 Obsidian 兼容的知识库，可直接作为 Obsidian vault 使用。

## 前置依赖

- **Node.js** >= 20
- **[Pi coding agent](https://github.com/nicepkg/pi)** — LLM 交互引擎
  ```bash
  npm i -g @mariozechner/pi-coding-agent
  ```
- **[oh-my-superpowers](https://github.com/anthropics/oh-my-superpowers)** — URL 提取（`omp-web-operator`）
  ```bash
  curl -fsSL https://raw.githubusercontent.com/anthropics/oh-my-superpowers/main/install.sh | bash
  ```

## 安装

```bash
# 克隆项目
git clone https://github.com/anthropics/knowledge-agent.git
cd knowledge-agent

# 安装依赖
npm install

# 全局链接（开发模式）
npm link
```

安装后即可在任意位置使用 `kb-agent` 命令。

## 快速开始

```bash
# 1. 初始化知识库
kb-agent init

# 2. 导入一篇文章
kb-agent ingest https://example.com/interesting-article

# 3. 导入文本（通过管道）
echo "一段有价值的笔记内容..." | kb-agent ingest --text

# 4. 向知识库提问
kb-agent query "这篇文章的核心观点是什么？"

# 5. 交互式对话
kb-agent chat
```

## 命令详解

### `kb-agent init`

初始化知识库目录结构。创建 `raw/`、`markdown/`、`wiki/` 及其子目录。幂等操作，重复运行不会覆盖已有文件。

```bash
kb-agent init
```

知识库数据存储在 `~/.local/share/kb-agent/`，可通过环境变量覆盖：

```bash
export KB_AGENT_DATA_DIR=~/my-knowledge-base
kb-agent init
```

### `kb-agent ingest <source>`

导入原始资料并自动触发快速编译。

```bash
# 导入 URL（通过 omp-web-operator 提取）
kb-agent ingest https://example.com/article

# 导入文本（管道输入）
cat notes.txt | kb-agent ingest --text

# 指定模型
kb-agent ingest https://example.com/article --model anthropic/claude-sonnet-4-6
```

导入流程：URL → Markdown 提取 → 保存到 `markdown/` → 快速编译生成 `wiki/sources/` 摘要 → 更新索引。

### `kb-agent compile`

深度编译：跨源综合，生成概念文章和知识地图。

```bash
kb-agent compile
```

深度编译只处理上次编译后新增的源文件（增量模式）。LLM 自主读取当前 wiki 状态，创建/更新 `concepts/`、`maps/`、`_index/`。

适合定期运行：

```bash
# cron: 每天凌晨 2 点深度编译
0 2 * * * kb-agent compile --mode json >> /var/log/kb-agent-compile.log 2>&1
```

### `kb-agent query <question>`

单次问答，LLM 通过分层索引导航知识库后回答问题。

```bash
kb-agent query "transformer 和 RNN 的主要区别是什么？"

# JSON 输出（适合脚本调用）
kb-agent query "列出所有关于注意力机制的文章" --mode json
```

### `kb-agent chat`

交互式对话，直接进入 Pi TUI 界面。LLM 可以实时读取和更新 wiki。

```bash
kb-agent chat

# 使用指定模型
kb-agent chat --model anthropic/claude-sonnet-4-6
```

在对话中可以：
- 提问并获得基于知识库的回答
- 要求 LLM 更新或补充 wiki 内容（feedback loop）
- 探索知识之间的关联

### `kb-agent lint`

健康检查：发现问题并立即修复（discover-and-fix）。

```bash
kb-agent lint
```

检查项：
- 跨文档矛盾
- 孤立文章（无索引引用）
- 断裂的 `[[wikilinks]]`
- 知识缺口
- 索引一致性（缺失条目、过期引用、统计数字）
- 潜在的跨源关联

### 通用选项

所有涉及 LLM 的命令支持：

| 选项 | 说明 | 示例 |
|---|---|---|
| `--model <model>` | 覆盖默认 LLM 模型 | `--model anthropic/claude-sonnet-4-6` |
| `--mode <mode>` | Pi 输出模式（text/json） | `--mode json` |

## 数据目录结构

```
~/.local/share/kb-agent/
├── raw/                  # 二进制原始文件（PDF/docx，未来支持）
├── markdown/             # 所有内容的 Markdown 化（统一格式）
├── wiki/                 # Obsidian 兼容知识库
│   ├── .obsidian/        # Obsidian 配置（wikilinks 已启用）
│   ├── SCHEMA.md         # 知识库组织规则（LLM 维护）
│   ├── sources/          # 来源摘要（1:1 对应 markdown/）
│   ├── concepts/         # 概念文章（跨源综合）
│   ├── maps/             # 知识地图（主题综述、时间线、对比）
│   └── _index/           # 分层索引
│       └── master.md     # 全局入口（LLM 第一个读的文件）
└── config.json           # 配置（版本、编译时间戳等）
```

### 在 Obsidian 中使用

`wiki/` 目录可以直接作为 Obsidian vault 打开：

1. 打开 Obsidian → "Open folder as vault"
2. 选择 `~/.local/share/kb-agent/wiki/`
3. `[[wikilinks]]` 和 frontmatter 开箱即用

## 架构

### Agent + Skill

kb-agent 使用单一 agent（**librarian** — 图书管理员）配合不同 skill 组合完成任务：

| 子命令 | 装备的 Skill |
|---|---|
| `ingest` | librarian + ingest + compile |
| `compile` | librarian + compile + search |
| `query` | librarian + search |
| `chat` | librarian + search + compile |
| `lint` | librarian + lint + search |

### Pi 集成

底层通过 [Pi coding agent](https://github.com/nicepkg/pi) 与 LLM 交互：
- 单次任务（ingest/compile/query/lint）：Pi print mode（子进程，收集输出）
- 交互对话（chat）：Pi TUI（stdio 直通，用户直接与 Pi 交互）

## 开发

```bash
# 运行测试
npm test

# 监听模式
npm run test:watch

# 构建
npm run build

# 运行单个测试文件
npx vitest run tests/commands/query.test.ts
```

## License

MIT
