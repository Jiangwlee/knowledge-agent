# Origin Idea

## 项目初心

这个项目起源于对 Andrej Karpathy 2026-04-02 推文的深度讨论。Karpathy 描述了一个用 LLM 构建和维护个人知识库的工作流，核心洞察是：LLM 不仅用于生成代码，更应用于"编译"知识——将零散的原始材料增量综合为结构化的、可查询的、自我修复的知识系统。

我们在分析这套方法论后，决定创建一个独立项目而非在已有的 media-editor skill 上改造，原因是两者解决的问题域根本不同：

- **media-editor** 解决"每天有什么新闻"——信息流过滤与存档
- **knowledge-agent** 解决"我对某个领域知道什么"——知识沉淀、综合与持续演进

两者是互补的上下游关系：media-editor 采集的高价值条目可以成为 knowledge-agent 的 raw 输入。

## Karpathy 方法论核心

原始推文：https://x.com/karpathy/status/2039805659525644595

### 五层架构

1. **Data Ingest** — 将原始材料（文章、论文、代码仓库、数据集、图片）索引到 `raw/` 目录
2. **Compilation** — LLM 增量"编译" raw 为 wiki（`.md` 文件目录结构），包含摘要、反向链接、概念文章、分类
3. **Q&A** — 对 wiki 进行自然语言复杂问答，LLM 自动维护索引文件和文档摘要
4. **Linting** — LLM 健康检查：发现不一致数据、填补缺失、发现跨文档关联、建议新文章候选
5. **Feedback Loop** — 查询结果和探索输出回写 wiki，让每次使用都增强知识库

### Karpathy 的关键设计决策

- **极致简单**：flat file system（嵌套 `.md` + `.png` 目录），无复杂插件或数据库
- **`AGENTS.md` 作为 schema**：LLM 通过读取这个文件理解整个 wiki 的组织结构
- **Human-in-the-loop**：早期手动逐个添加来源引导 LLM 学习模式，边际成本随使用递减
- **Obsidian 作为 IDE**：仅用于查看和浏览，不用于编辑（编辑是 LLM 的领域）
- **不用 RAG**：在约 100 篇文章 / 400K 字的规模下，LLM 通过索引文件和摘要就能找到相关数据

### 社区验证的经验

- **Linting 被严重低估** — 这是从静态知识转储变成活知识系统的关键层
- **反馈循环创造复利** — 传统笔记系统维护成本线性增长，LLM wiki 逆转这一曲线
- **~400K-700K tokens 是当前规模天花板** — 之后需要 RAG 或向量数据库
- **Markdown 是 LLM 的原生格式** — 层次结构语法化，LLM 天然理解

### 已知的开放问题

1. **Scale ceiling**：何时以及如何优雅地过渡到 RAG？
2. **Silent knowledge drift**：LLM 反复重写 wiki 时如何保证不偏离 source truth？谁来 lint linter？
3. **Temporal metadata**：时间维度如何管理？
4. **Cross-domain synthesis**：跨领域连接如何自动化？
5. **Verification gate**：哪些 LLM 写入需要人工验证？信任边界在哪里？
6. **Single-user bias**：Karpathy 的方案依赖他个人对 LLM 行为的深度直觉，一般用户如何复制？

## 我们的差异化思考

### 与 Karpathy 方案的区别

Karpathy 的方案是"一堆拼凑的脚本"（他自己的原话）。我们的目标是将其工程化为可复用的 skill + agent 架构，融入 oh-my-superpowers 生态：

1. **Skill 提供 CLI 原语**（init / compile / lint / query / ingest）
2. **Agent 编排工作流**（增量编译、健康检查、问答）
3. **与 media-editor 的上下游连接**（promote → ingest）
4. **与 Obsidian 的集成**（wiki 目标可以是 Obsidian vault）

### media-editor 现状分析

media-editor 是一个"采集 + 存档"系统，核心能力是 save/query/promote 的 CRUD 操作。对比 Karpathy 模型，缺失的关键层：

| 能力 | Karpathy | media-editor |
|------|----------|-------------|
| 数据摄入 | raw/ 目录 | save → JSONL + SQLite + cards |
| 编译/综合 | LLM 增量编译为 wiki | 无 |
| 反馈循环 | 查询输出回写 wiki | 无 |
| Linting | 健康检查、矛盾发现 | 无 |
| 跨文档关联 | 反向链接、概念文章 | 无（每条 card 是孤岛）|
| 查询能力 | 自然语言复杂问答 | 结构化 SQL filter |

media-editor 保持不变，继续承担信息流采集的职责。

## 初步架构草图

```
knowledge-agent/
├── raw/                      # 原始来源（从 media-editor promote、URL、文件导入）
├── wiki/                     # LLM 编译的 .md 知识库（可指向 Obsidian vault）
├── AGENTS.md                 # wiki schema，LLM 自动维护
├── scripts/
│   ├── compile.sh            # 增量编译 raw → wiki
│   ├── lint.sh               # 一致性检查、缺口发现
│   ├── query.sh              # 自然语言查询
│   └── ingest.sh             # 从 URL/文件导入到 raw/
├── docs/
│   └── origin-idea.md        # 本文档
└── SKILL.md                  # omp skill 定义
```

这只是初步草图，具体设计需要在后续讨论中逐步明确。

## 参考链接

- Karpathy 原帖：https://x.com/karpathy/status/2039805659525644595
- 完整翻译和评论整理：`~/Obsidian/X And Reddit/AI Knowledge and Memory System/0000_Karpathy_LLM_Wiki_Workflow.md`
- media-editor skill：`~/Projects/oh-my-superpowers/skills/media-editor/`
- media-editor agent：`~/Projects/oh-my-superpowers/agents/media-editor.md`
- oh-my-superpowers 框架：`~/Projects/oh-my-superpowers/`
- 社区衍生项目：
  - [Klore](https://github.com/vbarsoum1/klore) — LLM Knowledge Compiler CLI
  - [kdb](https://github.com/dremnik/kdb) — Markdown 知识库 CLI
  - [Cognisync](https://github.com/shrijacked/Cognisync) — Filesystem-first LLM 知识库框架
  - [ARS Contexta](https://github.com/agenticnotetaking/arscontexta) — Claude Code 知识管理插件
