# Knowledge Agent

> 基于 Karpathy LLM Wiki 方法论的通用 CLI 知识管理工具：将零散原始信息源编译为结构化、可查询、可关联的 Obsidian 兼容知识体系。

## 目录

- [设计方案](#设计方案)
  - [背景与目标](#背景与目标)
  - [定位与边界](#定位与边界)
  - [数据架构](#数据架构)
  - [CLI 设计](#cli-设计)
  - [Agent + Skill 架构](#agent--skill-架构)
  - [Karpathy 五层实现](#karpathy-五层实现)
  - [技术选型](#技术选型)
  - [项目结构](#项目结构)
  - [Roadmap](#roadmap)
- [行动原则](#行动原则)
- [行动计划（Phase 1：骨架搭建）](#行动计划phase-1骨架搭建)

---

## 设计方案

### 背景与目标

Andrej Karpathy 描述了一个用 LLM 构建和维护个人知识库的工作流（2026-04-02），核心洞察是 LLM 不仅用于生成代码，更应用于"编译"知识。他自己称之为"一堆拼凑的脚本"。本项目的目标是将其工程化为一个通用的、可复用的 CLI 工具。

成功标准：用户能通过 `kb-agent ingest` 导入任意来源，系统自动编译为结构化 wiki，并支持自然语言查询、健康检查和知识复利循环。

核心参考文档：
- `docs/karpathy-llm-wiki-workflow.md` — Karpathy 原帖完整翻译 + 社区讨论
- `docs/origin-idea.md` — 项目初心与差异化思考（注：其中的架构草图已被本文档取代）

### 定位与边界

**是什么：**
- 独立项目、独立 repo
- CLI 工具（`kb-agent`），底层通过 Pi agent 与 LLM 交互
- 数据 flat files（`.md` + 图片），Obsidian 兼容（`[[wikilinks]]`、frontmatter），wiki/ 可作为独立 Obsidian vault
- 代码与数据分离：源码在 repo，数据在 `~/.local/share/kb-agent/`（`KB_AGENT_DATA_DIR` 环境变量覆盖）
- 可 cron 定期运行
- 未来有产品化潜力（Web UI），但不是现阶段

**不是什么：**
- 不是 Web 服务（现阶段）
- 不是 omp skill（但可调用 omp 工具如 web-operator）
- 不是 RAG 系统（400K-700K tokens 规模内用索引导航）
- 不是笔记工具（编辑是 LLM 的领域）

### 数据架构

#### 四级数据管线

```
raw/ → markdown/ → wiki/ → Agent Q&A
存证层    提取层(汇聚点) 知识层    交互层
```

| 层 | 目录 | 内容 | 特点 |
|---|---|---|---|
| 存证层 | `raw/` | PDF、docx、图片等二进制原始文件 | 不可变，仅二进制文件需要此层 |
| 提取层 | `markdown/` | 所有内容统一为 `.md` + 关联图片 | **汇聚点**：无论来源是 raw/ 提取还是 URL 直接产出，进入此层后身份统一为"LLM 可读的工作副本"。忠实提取，不综合。 |
| 知识层 | `wiki/` | LLM 编译产物 | Obsidian 兼容的知识库 |
| 交互层 | — | `kb-agent query` / `kb-agent chat` | 输出可回写 wiki（feedback loop） |

#### Wiki 三层结构（图书馆模型）

```
wiki/
├── SCHEMA.md          # 书架布局图（LLM 维护，组织规则）
├── sources/           # 来源摘要（1:1 对应 markdown/）
├── concepts/          # 概念文章（跨源综合）
├── maps/              # 地图（主题综述、时间线、对比分析）
└── _index/            # 目录卡片柜（分层索引，按需加载）
    ├── master.md      # 全局索引（LLM 第一个读的文件）
    ├── by-topic.md
    ├── by-date.md
    └── ...
```

#### 编译策略

- **快速编译**（ingest 时触发）：分类 + 摘要 + 挂到索引，秒级完成
- **深度编译**（cron 定期 / 手动）：跨源关联、概念提炼、maps 生成、lint 融合

#### 索引设计

分层加载，类似 SKILL 的渐进加载机制：LLM 先读 `_index/master.md`（全局概览）→ 按需加载具体 topic 索引 → 定位到具体 source/concept/map。避免全量加载 wiki 到上下文。

#### 存储目录

```
~/.local/share/kb-agent/
├── raw/
├── markdown/
├── wiki/            # 可作为 Obsidian vault
│   └── .obsidian/
└── config.json
```

### CLI 设计

#### 入口

```
kb-agent <subcommand> [options]
```

#### 子命令

| 子命令 | 涉及 LLM | 说明 |
|---|---|---|
| `init` | 否 | 初始化知识库目录结构 |
| `ingest <source>` | 是 | 导入原始资料，触发快速编译 |
| `compile` | 是 | 深度编译 |
| `lint` | 是 | 健康检查 |
| `query <question>` | 是 | 自然语言问答 |
| `chat` | 是 | 交互式对话（Pi TUI） |

#### LLM 子命令通用参数

```
--model <model>    指定模型（覆盖默认）
--mode <mode>      Pi 输出模式：text / stream / json / interactive
```

实现需工程化，编码时参考 omp 的 `bin/omp` 和 `omp run`。

#### Bootstrap

`kb-agent init` 创建目录结构 + 空 SCHEMA.md + 空 master.md。前 N 篇由用户 human-in-the-loop 引导 LLM 学习组织模式，LLM 逐步丰富 SCHEMA.md 和索引。

### Agent + Skill 架构

#### Agent：唯一一个

**librarian**（图书管理员）— 按任务装备不同 skill，prompt 保持灵活性，不写死职责。不同子命令通过加载不同 skill 组合来获得对应能力，而非在单一 prompt 中塞入所有职责，从而避免 prompt 膨胀。

#### Skills

| Skill | 能力 |
|---|---|
| `ingest` | 各种来源的导入（URL 提取、PDF 转换、文件处理） |
| `compile` | 编译（摘要生成、概念提炼、索引维护、maps 生成） |
| `search` | 检索（分层索引导航、全文搜索） |
| `lint` | 审查（一致性检查、缺口发现、关联建议） |

#### 子命令 → Skill 装备

| 子命令 | 装备的 skill |
|---|---|
| `ingest` | ingest + compile（快速） |
| `compile` | compile + search |
| `query` | search |
| `chat` | search + compile（feedback 回写） |
| `lint` | lint + search |

### Karpathy 五层实现

#### 1. Ingest（数据摄入）

| 输入 | raw/ | markdown/ | 工具 |
|---|---|---|---|
| URL | — | 直接产出 `.md` | web-operator / defuddle |
| PDF | 存原文件 | 转为 `.md` | PDF 转换工具 |
| docx | 存原文件 | 转为 `.md` | docx 转换工具 |
| 图片 | 存原文件 | 生成描述 `.md`（LLM） | 多模态 LLM |
| 文本/粘贴 | — | 直接存为 `.md` | — |

Ingest 完成后自动触发快速编译。

#### 2. Compile（编译）

- 快速编译：单源 → sources/ 摘要 + 索引更新
- 深度编译：跨源综合 → concepts/ + maps/ + _index/ + SCHEMA.md

#### 3. Query（问答）

LLM 通过分层索引导航：master.md → topic 索引 → 具体文章 → 回答

#### 4. Lint（健康检查）

跨文档矛盾、缺失数据、跨领域关联、孤立文章、索引一致性、新 concept/map 候选

#### 5. Feedback Loop（反馈循环）

Query/Chat 输出回写 wiki，Lint 发现的关联更新 maps/ 和 _index/。每次使用增强知识库。

### 技术选型

| 组件 | 选型 | 说明 |
|---|---|---|
| 语言 | JavaScript/TypeScript | 统一技术栈，未来产品化不用重写 |
| CLI 框架 | 待定 | 编码时确认 |
| LLM 交互 | Pi RPC | 参考 omp run、minora-ui team lead |
| 网页提取 | web-operator / defuddle | 外部依赖 |
| PDF/docx 转换 | 待定 | 编码时调研 |
| Markdown 输出 | Obsidian 兼容 | `[[wikilinks]]`、frontmatter |

#### 参考实现（编码时阅读）

- `~/Projects/minora-ui/` — Pi RPC 集成、前端风格、markdown 渲染
- `~/Projects/oh-my-superpowers/bin/omp` — CLI 入口 + --mode/--model 工程化
- `~/Obsidian/` 中 pi-coding-agent 相关研究成果

### 项目结构

```
knowledge-agent/
├── install.sh             # 一键安装（curl | bash 或 ./install.sh）
├── bin/
│   └── kb-agent
├── src/
│   ├── commands/
│   └── pipeline/
├── agents/
│   └── librarian.md
├── skills/
│   ├── ingest/
│   ├── compile/
│   ├── search/
│   └── lint/
├── docs/
│   ├── origin-idea.md
│   └── karpathy-llm-wiki-workflow.md
├── tests/
├── package.json
└── CLAUDE.md
```

### Roadmap

#### Phase 0：文档完善（当前）
完成设计文档，明确所有架构决策，不写代码。

#### Phase 1：骨架搭建
- `install.sh` 一键安装脚本（支持 `curl ... | bash` 和 `./install.sh` 两种模式）
- `kb-agent init`、CLI 入口 + 子命令路由
- `--model` / `--mode` 参数实现
- Pi agent 连接
- `librarian.md` 初版 prompt

#### Phase 2：Ingest + 快速编译
- URL / 本地文件导入
- 快速编译：markdown → sources/ + 索引
- Bootstrap 模式
- 基本索引一致性保障（编译后验证 _index/ 与实际文件匹配）

#### Phase 3：Query + Chat
- 分层索引导航 + 回答
- Pi TUI 交互式对话
- Feedback loop 回写

#### Phase 4：深度编译 + Lint
- 跨源综合、concepts/、maps/ 生成
- 健康检查全套
- Cron 支持

#### Phase 5：打磨
- 索引一致性深度保障（并发安全、原子性写入）
- Obsidian 兼容性调优
- 边界情况处理

#### 未来（不在当前规划内）
- Web UI 产品化
- 多知识库管理
- RAG 引入（规模突破 700K tokens 时）
- 上游系统集成

### 关键决策

- **独立项目而非 omp skill**：未来有独立产品化潜力，omp skill 框架无法承载全栈 Web 应用
- **单 agent + 多 skill**：图书管理员隐喻——同一个角色按任务装备不同工具，避免 prompt 膨胀
- **四级管线而非 Karpathy 二级**：raw/ 和 markdown/ 分层，关注点分离更干净，markdown/ 作为汇聚点统一所有来源
- **Wiki 三层图书馆模型**：sources（书）+ concepts（百科词条）+ maps（导读综述），显式化 Karpathy 隐含的结构
- **分层索引按需加载**：LLM 通过 master.md → topic 索引 → 具体文章逐层导航，不全量加载
- **Bootstrap 模式**：复刻 Karpathy 的 human-in-the-loop 早期阶段，让 LLM 通过实例学习组织偏好
- **JavaScript/TypeScript**：统一技术栈，CLI 阶段和未来 Web UI 阶段不用重写

---

## 行动原则

- **TDD: Red → Green → Refactor**：先写失败测试，再写最小实现，最后重构。 **禁止：** 先写实现再补测试；无测试的功能提交。
- **Break, Don't Bend**：接口设计错误时直接修正，不建兼容层。 **禁止：** `deprecated`、`legacy`、`v1/v2` 等兼容性标记。
- **Zero-Context Entry**：每个文件前 20 行必须让读者无需外部知识即可理解其职责。 **禁止：** 文件无头部说明；文档无目录。
- **First Principles over Analogy**：从根本需求出发，不套用架构模式。 **禁止：** "业界通常这样做"作为设计理由。
- **Explicit Contract**：行为、依赖和配置必须在代码中明确声明。 **禁止：** 魔法默认值；未声明的副作用。
- **Minimum Blast Radius**：每次提交只解决一个明确问题。 **禁止：** 一个 PR 混合功能开发与重构。

---

## 行动计划（Phase 1：骨架搭建）

### 文件结构设计

| 操作 | 文件路径 | 职责 |
|------|----------|------|
| 新增 | `install.sh` | 一键安装脚本（remote: curl \| bash, local: ./install.sh） |
| 新增 | `package.json` | 项目元数据、依赖、scripts |
| 新增 | `tsconfig.json` | TypeScript 配置 |
| 新增 | `bin/kb-agent` | CLI 入口脚本（shebang + 分发到 commands） |
| 新增 | `src/cli.ts` | CLI 解析主逻辑：子命令路由、全局参数（--model, --mode） |
| 新增 | `src/commands/init.ts` | `kb-agent init` 实现：创建数据目录结构 |
| 新增 | `src/commands/ingest.ts` | `kb-agent ingest` 占位（Phase 2 实现） |
| 新增 | `src/commands/compile.ts` | `kb-agent compile` 占位（Phase 2 实现） |
| 新增 | `src/commands/lint.ts` | `kb-agent lint` 占位（Phase 4 实现） |
| 新增 | `src/commands/query.ts` | `kb-agent query` 占位（Phase 3 实现） |
| 新增 | `src/commands/chat.ts` | `kb-agent chat` 占位（Phase 3 实现） |
| 新增 | `src/config.ts` | 配置管理：数据目录路径解析、config.json 读写 |
| 新增 | `src/pi.ts` | Pi RPC 连接封装（参考 minora-ui team lead） |
| 新增 | `agents/librarian.md` | Pi agent prompt 初版 |
| 新增 | `tests/commands/init.test.ts` | init 命令测试 |
| 新增 | `tests/cli.test.ts` | CLI 路由测试 |
| 新增 | `tests/config.test.ts` | 配置管理测试 |

### 任务步骤

#### Task 0: install.sh 安装脚本

**Files:**
- 新增: `install.sh`

- [ ] **Step 1: 写失败测试** (~3 min)

  - Remote 模式（stdin 执行）：克隆 repo 到 `~/.kb-agent/`，`npm install`，symlink `bin/kb-agent` 到 `~/.local/bin/`
  - Local 模式（`./install.sh`）：symlink 当前目录到 `~/.kb-agent/`，symlink `bin/kb-agent` 到 `~/.local/bin/`
  - 依赖检查：`node` 和 `npm` 必须存在，否则报错退出
  - 幂等：重复执行不报错
  - PATH 检查：`~/.local/bin` 不在 PATH 时给出提示

- [ ] **Step 2: 实现 install.sh** (~5 min)

  - 复用 omp `install.sh` 的模式：`detect_mode()` → `check_deps()` → `install_local/remote()` → `register_bins()` → `check_path()`
  - 常量：`GITHUB_REPO`、`INSTALL_DIR=~/.kb-agent`、`BIN_DIR=~/.local/bin`
  - Remote 模式额外执行 `npm install --production`
  - 参考：`~/Projects/oh-my-superpowers/install.sh`

- [ ] **Step 3: 测试两种模式** (~3 min)

- [ ] **Step 4: 提交** (~1 min)

#### Task 1: 项目初始化

**Files:**
- 新增: `package.json`, `tsconfig.json`

- [ ] **Step 1: 写失败测试** (~2 min)

  测试 `kb-agent --version` 能输出版本号。

- [ ] **Step 2: 初始化 package.json** (~3 min)

  - `name`: `kb-agent`
  - `type`: `module`
  - `bin`: `{ "kb-agent": "./bin/kb-agent" }`
  - 依赖：CLI 框架（编码时确认）、TypeScript
  - scripts: `build`, `test`

- [ ] **Step 3: 配置 tsconfig.json** (~2 min)

  - target: ESNext, module: NodeNext
  - outDir: `dist/`
  - strict: true

- [ ] **Step 4: 验证 `npm run build` 通过** (~1 min)

- [ ] **Step 5: 提交** (~1 min)

#### Task 2: CLI 入口 + 子命令路由

**Files:**
- 新增: `bin/kb-agent`, `src/cli.ts`
- 测试: `tests/cli.test.ts`

- [ ] **Step 1: 写失败测试** (~3 min)

  - `kb-agent init` 路由到 init handler
  - `kb-agent ingest` 路由到 ingest handler
  - 未知子命令输出 help
  - `--model` 和 `--mode` 被解析并传入 handler

- [ ] **Step 2: 运行测试确认失败** (~1 min)

- [ ] **Step 3: 实现 bin/kb-agent** (~2 min)

  - Shebang: `#!/usr/bin/env node`
  - 导入并执行 `src/cli.ts`

- [ ] **Step 4: 实现 src/cli.ts** (~5 min)

  - 函数签名: `function main(argv: string[]): Promise<void>`
  - 关键逻辑: 解析子命令名 + 全局参数 `--model` / `--mode`，分发到对应 command handler
  - 边界情况: 无子命令时输出 help；未知子命令报错

- [ ] **Step 5: 运行测试确认通过** (~1 min)

- [ ] **Step 6: 提交** (~1 min)

#### Task 3: 配置管理

**Files:**
- 新增: `src/config.ts`
- 测试: `tests/config.test.ts`

- [ ] **Step 1: 写失败测试** (~3 min)

  - 默认数据目录为 `~/.local/share/kb-agent/`
  - `KB_AGENT_DATA_DIR` 环境变量覆盖默认路径
  - `getDataDir()` 返回正确路径
  - `getSubDir('raw')` 返回 `<dataDir>/raw/`

- [ ] **Step 2: 运行测试确认失败** (~1 min)

- [ ] **Step 3: 实现 src/config.ts** (~4 min)

  - 函数签名: `function getDataDir(): string`
  - 函数签名: `function getSubDir(name: 'raw' | 'markdown' | 'wiki'): string`
  - 函数签名: `function readConfig(): Config`
  - 函数签名: `function writeConfig(config: Config): void`
  - 关键逻辑: 优先读 `KB_AGENT_DATA_DIR` 环境变量，fallback 到 `~/.local/share/kb-agent/`
  - 边界情况: 目录不存在时不自动创建（由 init 命令负责）

- [ ] **Step 4: 运行测试确认通过** (~1 min)

- [ ] **Step 5: 提交** (~1 min)

#### Task 4: init 命令

**Files:**
- 新增: `src/commands/init.ts`
- 测试: `tests/commands/init.test.ts`

- [ ] **Step 1: 写失败测试** (~3 min)

  - 在临时目录中执行 init，验证创建了完整目录结构
  - 验证 `raw/`、`markdown/`、`wiki/` 目录存在
  - 验证 `wiki/SCHEMA.md` 存在且非空（包含初始骨架）
  - 验证 `wiki/_index/master.md` 存在且非空
  - 验证 `wiki/sources/`、`wiki/concepts/`、`wiki/maps/` 目录存在
  - 验证 `config.json` 存在
  - 重复执行 init 是幂等的（不覆盖已有内容）

- [ ] **Step 2: 运行测试确认失败** (~1 min)

- [ ] **Step 3: 实现 src/commands/init.ts** (~5 min)

  - 函数签名: `async function initCommand(options: CommandOptions): Promise<void>`
  - 关键逻辑: 创建目录树 + 写入 SCHEMA.md 初始骨架 + 写入空 master.md + 写入默认 config.json
  - SCHEMA.md 初始内容: wiki 组织规则说明（LLM 读取后知道如何维护 wiki）
  - master.md 初始内容: 空索引模板
  - 边界情况: 目录已存在时跳过；文件已存在时不覆盖

- [ ] **Step 4: 运行测试确认通过** (~1 min)

- [ ] **Step 5: 提交** (~1 min)

#### Task 5: 子命令占位

**Files:**
- 新增: `src/commands/ingest.ts`, `src/commands/compile.ts`, `src/commands/lint.ts`, `src/commands/query.ts`, `src/commands/chat.ts`

- [ ] **Step 1: 为每个子命令创建占位模块** (~3 min)

  每个文件导出一个 handler 函数，执行时输出 `"[command] not yet implemented (Phase N)"` 并正常退出。

- [ ] **Step 2: 验证所有子命令可路由** (~2 min)

  运行 `kb-agent ingest test-url`、`kb-agent compile` 等，确认输出占位信息而非报错。

- [ ] **Step 3: 提交** (~1 min)

#### Task 6: Pi RPC 连接封装

**Files:**
- 新增: `src/pi.ts`

- [ ] **Step 1: 阅读参考实现** (~5 min)

  阅读 `~/Projects/minora-ui/` 中 team lead 的 Pi RPC 调用代码，理解连接方式、消息格式、错误处理。
  阅读 `~/Projects/oh-my-superpowers/bin/omp` 中 `--model` / `--mode` 的实现。

- [ ] **Step 2: 写失败测试** (~3 min)

  - 能创建 Pi 连接实例
  - 能发送消息并接收响应（mock Pi server）
  - `--model` 参数正确传递
  - `--mode` 参数影响输出格式

- [ ] **Step 3: 实现 src/pi.ts** (~5 min)

  - 函数签名: `function createPiClient(options: { model?: string; mode?: string }): PiClient`
  - 函数签名: `async function sendMessage(client: PiClient, message: string, skills?: string[]): Promise<PiResponse>`
  - 关键逻辑: 基于参考实现封装 Pi RPC 调用，处理 model/mode 参数
  - 边界情况: Pi 不可用时给出清晰错误信息

- [ ] **Step 4: 运行测试确认通过** (~1 min)

- [ ] **Step 5: 提交** (~1 min)

#### Task 7: librarian agent prompt 初版

**Files:**
- 新增: `agents/librarian.md`

- [ ] **Step 1: 编写 librarian.md** (~5 min)

  Pi agent 格式：frontmatter（name, description, tools, model）+ system prompt。
  角色定义要灵活：图书管理员，职责随装备的 skill 变化。
  包含 Variables 段定义 `DATA_DIR` 等常量。
  参考 `~/Projects/oh-my-superpowers/agents/media-editor.md` 的格式。

- [ ] **Step 2: 提交** (~1 min)

#### Task 8: Skill 目录骨架

**Files:**
- 新增: `skills/ingest/SKILL.md`, `skills/compile/SKILL.md`, `skills/search/SKILL.md`, `skills/lint/SKILL.md`

- [ ] **Step 1: 为每个 skill 创建 SKILL.md** (~5 min)

  每个 SKILL.md 包含 frontmatter（name, description）和基本的能力描述。
  description 中写明触发条件（Use when / Do NOT use when）。
  具体实现细节留空，后续 Phase 填充。

- [ ] **Step 2: 提交** (~1 min)

#### Task 9: 完成核查

**目的：** 防止 agent 虚报"任务完成"而实际存在遗漏或偏差。

- [ ] **Step 1: 对照 spec 逐 Task 核查**

  打开本文档的"任务步骤"列表，逐一确认每个 Task 的每个 Step 均已完成（checkbox 已勾选或有对应产出）。

- [ ] **Step 2: 对照 spec 设计方案验证无偏差**

  重新阅读本文档"设计方案"章节，对比已实现内容，确认：
  - 架构与组件划分与设计一致
  - 接口与数据流与设计一致
  - 所有"关键决策"均已落地，未被静默替换

- [ ] **Step 3: 向用户汇报**

  输出格式：
  ```
  ## 完成核查报告
  - 已完成 Tasks: X / X
  - 未完成 Steps（如有）: [列举]
  - 与 spec 偏差（如有）: [列举]
  - 结论: ✅ 全部完成，无偏差 / ⚠️ 存在问题（见上）
  ```

#### Task 10: 文档更新

**Files:**
- 修改: `CLAUDE.md`

- [ ] **Step 1: 更新 CLAUDE.md**

  确保 CLAUDE.md 中的项目结构、命令说明与实际实现一致。

- [ ] **Step 2: 提交**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for Phase 1 implementation"
```
