# Knowledge Base Navigation Design

> 记录 knowledge-agent 的知识库导航设计，围绕图书馆模型稳定主书架、目录卡片与导航协议，避免后续 query、compile、index 设计漂移。

## 目的

这份文档回答三个问题：

- `master.md` 第一层应该有哪些主书架
- 第一层之下的统一二级卡片骨架是什么
- 从初态到终态的演进规则是什么

暂不展开：

- compile 如何自动生成 topics
- `by-topic/` 的文件格式
- topic 间交叉引用策略

这些留到后续文档。

## 背景

当前项目采用 Karpathy 风格的图书馆隐喻：

- `SCHEMA.md` 是书架布局图
- `_index/master.md` 是总目录
- `maps/`、`concepts/`、`sources/` 是馆藏材料

因此第一层目录的任务不是“提高召回率”，而是给 LLM 一个稳定的导航入口，让它先决定该去哪一个书架，再进入更细的目录和文章。

## 设计原则

### 1. 第一层是书架，不是标签

主书架必须是稳定的导航区，而不是任意关键词、标签或临时聚类。

判断标准：

- 用户能把一个问题先归到某个书架
- compile 可以把新来源先归到某个书架
- query 进入该书架后，错误率会下降

如果一个分类做不到这三点，它就不应该成为第一层书架。

### 2. 第一层要克制

当前知识库规模仍然较小，第一层书架数量应保持克制。

目标：

- 足够少，让 LLM 容易选路
- 足够稳，不因单篇新 source 就重构
- 足够大，每个书架能承载多篇 `sources` 和后续 `concepts/maps`

### 3. 第一层服务 query，不服务搜索

第一层目录的作用是：

- 决定先去哪找
- 暴露哪些区成熟、哪些区稀疏
- 让“找不到”被解释为知识库缺口，而不是搜索失败

### 4. 结构从数据中生长，不从设计中预设

知识库的导航结构应该随内容增长而逐步展开，而不是在内容稀疏时就暴露完整终态。

核心规则：

- 候选书架可以存在于架构文档中，但不等于运行时目录中的正式入口
- 只有达到激活阈值的书架才出现在 `master.md`
- 书架页的复杂度应与内容规模匹配，小规模用扁平结构，成熟后再展开分层

这条原则的来源：Karpathy 明确表示目录结构是"LLM 通过实例学习你的组织偏好"涌现出来的，而不是预先定义的。本项目做工程化，允许先设计弱约束骨架，但骨架不能太硬、太早暴露。

### 5. 跨书架视角不应混入第一层

有些内容类型会在多个书架里重复出现，例如：

- Best Practices
- Comparisons
- Timelines
- Open Questions

这些属于跨书架视角，不应直接当作第一层 topic。

## 第一层主书架

### 候选书架

以下是当前确认的候选主书架：

1. `AI Agent Systems`
2. `LLM Models`
3. `Trading`
4. `Design`
5. `GitHub Projects`

候选书架定义在架构文档中，供 compile 归类时参考，但不一定全部出现在运行时 `master.md` 中。

### 激活规则

候选书架必须满足激活条件才能注册为 `master.md` 的正式入口。

**激活判据**（同时满足）：

- **数量门槛**：书架下至少有一定数量的已编译 sources（初始建议值：3 篇，待实际运行验证后调整）
- **主题集中度**：这些 sources 应构成一个可导航的主题区，而非碰巧被归到同一书架的散乱内容。操作化判断：多数 sources 能共享同一书架描述；能从中抽出至少一个稳定的 concept 候选；不是仅凭来源形式相似（如"都是 GitHub 项目"）而聚在一起
- **激活方式**：compile 在归类新 source 时检查，满足条件后自动注册

**未激活书架**：不以任何形式出现在运行时 `master.md` 中。候选书架的完整列表维护在 `SCHEMA.md`，供 compile 归类时参考。

**降级与滞回**：

- 书架可以从已激活降级为未激活（从 master.md 移除），但需要 lint 建议 + 人工确认
- 降级条件：内容持续低于门槛且无新增趋势，不立即降级以避免抖动
- 降级时，书架页文件（`by-topic/<slug>.md`）保留不删除，页面结构也不回退。这样如果后续重新激活，不需要从零重建
- 简言之：书架的可见性可降级，书架页的结构不回退

**说明**：数量门槛是经验值，不是硬约束。如果实际运行中发现 3 篇不够区分有效书架和噪声书架，应调整。判断标准始终是：该书架是否已成为 query 的有效导航入口。

## 各主书架的职责边界

### `AI Agent Systems`

关注：

- AI agent 的概念、架构、workflow、tool use
- Harness、eval loop、多 agent 协作
- 官方工程实践与实际方法论

典型来源：

- x.com / reddit
- Claude Code / OpenAI / Anthropic 官方工程实践
- agent engineering 相关文章与 talk

不负责：

- 纯模型训练与 benchmark 细节
- 单个开源仓库本身的项目档案

### `LLM Models`

关注：

- 模型训练、对齐、推理、架构、能力边界
- benchmark、eval、reasoning、inference

典型来源：

- 模型论文
- 官方技术报告
- benchmark / eval 文章

不负责：

- agent workflow 方法论
- 某个仓库的项目演进记录

### `Trading`

关注：

- 股票交易
- strategy、execution、risk management、market structure

典型来源：

- 市场研究
- 交易策略笔记
- 风险管理与执行经验

不负责：

- 泛金融新闻归档
- 不成体系的日常行情碎片

### `Design`

关注：

- UI/UX
- Web design
- interaction patterns
- visual systems
- frontend experience

典型来源：

- 设计案例
- 前端设计方法论
- 设计系统与交互文章

不负责：

- 一般前端工程实现细节
- 非设计导向的仓库分析

### `GitHub Projects`

关注：

- 感兴趣的开源项目
- 仓库架构、实现思路、作者实践、项目演进

典型来源：

- GitHub 仓库 README / docs / issue / PR
- 作者博客与项目讨论

不负责：

- 从某个项目中抽象出来的通用 agent 理论
- 与项目对象无关的独立方法论

说明：

- 项目本身归入 `GitHub Projects`
- 从项目中抽象出来的通用知识，应回流到相应学科书架，例如 `AI Agent Systems` 或 `LLM Models`

## 不作为第一层主书架的内容

### `Best Practice`

当前明确不作为第一层主书架。

原因：

- 它不是稳定主题区，而是跨多个书架都会出现的组织视角
- 如果放到第一层，会把目录从“图书馆”拉回“标签系统”

后续更适合作为：

- 每个书架内部的文档视角
- `maps/` 中的一类综述文章
- 二级目录中的固定入口

## 对 `master.md` 的影响

`_index/master.md` 的职责：

- 只列出已激活书架（达到阈值的）
- 用简短描述说明每个书架关注什么
- 展示每个书架的内容统计（sources / concepts / maps 数量）
- 明确哪些内容是跨书架视角，不是书架
- 包含 Recent Activity，暴露知识库的生长方向
- 定义 Query Protocol（唯一定义点，书架页不重复）

`master.md` 不应承担：

- 罗列大量具体文章
- 展示未激活的候选书架（可用 HTML 注释标注）
- 用标签云替代书架结构

## 第二层统一骨架

当前确认：每个主书架之下，先统一使用 4 类目录卡片，而不是直接展开大量子 topic。

统一二级卡片：

1. `Maps`
2. `Concepts`
3. `Sources`
4. `Gaps`

### 为什么第二层先不用“子 topic 列表”

如果第二层一开始就展开成很多子 topic，会带来几个问题：

- 目录过早长成分类树，后续难以稳定
- LLM 需要在过多候选间选路，反而更容易迷路
- compile 很容易把临时聚类错误固化为长期结构

因此第二层先统一为“卡片类型”，而不是“子学科树”。

### `Maps`

职责：

- 提供综述、对比、时间线、方法论总览
- 适合回答 “怎么做 / 如何比较 / 全貌是什么”
- 帮助 query 快速建立整体理解

说明：

- `Best Practices`
- `Comparisons`
- `Timelines`

这类内容通常应作为 `Maps` 中的文档形态，而不是独立书架或独立第二层目录。

### `Concepts`

职责：

- 承载稳定概念与术语定义
- 解释边界、关系和常见混淆
- 适合回答 “这是什么 / 与什么不同”

### `Sources`

职责：

- 保存单篇来源摘要
- 承担证据层与出处层
- 适合回答 “依据是什么 / 谁说的 / 原文来自哪里”

### `Gaps`

职责：

- 显式记录当前书架的知识缺口
- 告诉 query 哪些内容还没有被整理成 concept 或 map
- 告诉 compile / lint 下一步该补什么

治理规则：

- Gaps 不是 lint 的垃圾桶。每条 gap 必须可导航、可行动
- 保持克制：gaps 数量应与书架规模匹配，避免膨胀。小书架几条即可，大书架可以多一些，但始终只保留最重要的缺口
- 排序标准（优先级从高到低）：
  1. 阻塞 concept 或 map 生长的缺口（有多篇 source 但无法综合）
  2. query 频繁命中但无法回答的问题
  3. 证据冲突尚未解决的区域
- 每条 gap 应说明"缺什么"和"为什么重要"，不能只是"XXX 还没有"
- lint 发现的潜在缺口应标注 `[suggested]`，只有经过 compile 确认后才去掉标注
- 定期清理：已补充的 gap 应及时移除；低优先级 gap 在列表过长时应被裁剪

### 书架页的两阶段成长

书架页的结构复杂度应与内容规模匹配，不应在内容稀疏时就展开完整的四卡片骨架。

**阶段一：扁平书架页**

书架内容较少、尚未产生 concepts 和 maps 时，书架页只做一件事：列出核心 sources 和简短说明。

文件位置：`_index/by-topic/<shelf-slug>.md`（阶段一也创建此文件，query 的固定入口不变）

最小 section 集合：

1. 书架简介（blockquote，一行）
2. `## Sources`（直接列条目）
3. `## Gaps`（简短缺口说明）

```md
# AI Agent Systems

> AI agent concepts, harnesses, workflows, evaluation loops, engineering practice.

## Sources

- [[sources/harness-design-for-long-running-application-development]] — harness 设计方法论
- [[sources/designing-ai-resistant-technical-evaluations]] — eval 设计
- [[sources/andrej-karpathy-karpathy]] — Karpathy LLM Wiki 工作流

## Gaps

- Concept coverage incomplete, no maps yet.
```

**阶段二：四卡片书架页**

当某个书架积累到足够内容，compile 已经能够生成 concepts 和 maps 时，书架页展开为完整的四卡片结构（见后续"书架页样板"部分）。过渡的判断标准不是固定数字，而是：书架是否已经产生了可独立成文的 concepts 或 maps。初始建议值为 sources ≥ 15 篇左右，但这是经验参考，不是硬阈值。

文件位置：不变，仍然是 `_index/by-topic/<shelf-slug>.md`，query 入口路径不变。

**过渡规则**：

- 阶段一到阶段二的过渡由 compile 触发，不需要人工干预
- 过渡时，原有的扁平 sources 列表重组进 Sources 卡片
- Gaps 从简单的一行描述展开为结构化的缺口列表
- 过渡是单向的：一旦展开为四卡片结构，不再退回扁平页

**query 路由规则**：

- 无论阶段一还是阶段二，query 进入书架的固定入口都是 `_index/by-topic/<shelf-slug>.md`
- 阶段一：query 直接扫描 Sources 列表
- 阶段二：query 按问题类型选择 Maps / Concepts / Sources / Gaps

### 对 query 的路由意义

进入任一主书架后，query 可以先按问题类型选卡片：

- “是什么” → `Concepts`
- “怎么做 / 最佳方法 / 对比 / 总览” → `Maps`
- “依据 / 引用 / 谁提出的” → `Sources`
- “知识库是否覆盖此问题” → `Gaps`

这比直接猜子 topic 更稳定。

## `master.md` 第一版模板

第一版 `master.md` 应是一张馆地图，而不是馆藏清单。

关键约束：

- **只展示已激活书架**，候选书架不以任何形式出现（包括注释），完整候选列表在 `SCHEMA.md`
- **Query protocol 只在这里定义一次**，书架页不重复
- **包含 Recent Activity**，作为轻量导航信号（不是日志流）

建议模板：

```md
# Master Index

> LLM entry point: read this file first to navigate the knowledge base.

## Query Protocol

Navigation rule:
1. Pick the most relevant bookshelf.
2. Within that bookshelf, read the shelf page for reading order and available material.
3. For mature shelves (with Maps/Concepts/Sources/Gaps sections), choose by question type:
   - “what is X” → Concepts
   - “how / compare / overview” → Maps
   - “evidence / who said” → Sources
   - “does the library cover this” → Gaps
4. For young shelves (flat source list), scan the listed sources directly.
5. If the shelf does not contain enough material, say so clearly — treat it as a knowledge gap, not a search failure.

## Bookshelves

### AI Agent Systems
Focus: AI agents, harnesses, workflows, tool use, evaluation loops, engineering practice.
Sources: 12 | Concepts: 4 | Maps: 2
Status: growing

### GitHub Projects
Focus: repositories, architectures, implementation notes, maintainers, project evolution.
Sources: 5 | Concepts: 1 | Maps: 0
Status: young

## Cross-Cutting Views

These are perspectives inside bookshelves, not top-level bookshelves:
- Best Practices
- Comparisons
- Timelines
- Open Questions

## Recent Activity

- 2026-04-03: New concept — context-anxiety (AI Agent Systems)
- 2026-04-01: Shelf activated — GitHub Projects

## Library Status

- Active bookshelves: 2
- Sources: <count>
- Concepts: <count>
- Maps: <count>
```

### Recent Activity 治理规则

Recent Activity 是轻量导航信号，不是操作日志。

**记录范围**（只记录对导航有影响的结构变化）：

- 书架激活或降级
- 新 concept 或 map 的生成
- 书架从阶段一过渡到阶段二

**不记录**：

- 普通 source 导入（这是常规操作，不影响导航结构）
- lint 发现的建议（这属于 Gaps，不属于 Activity）
- 文件内容的增量更新

**保留上限**：保持短小，只保留最近少量结构性变化，默认约 5 条，必要时可调整。超出时删除最旧的条目。

**维护方**：compile 在产生结构变化时自动追加；lint 在清理周期中裁剪过期条目。

## 当前结论

候选主书架确定为 5 个：

- `AI Agent Systems`
- `LLM Models`
- `Trading`
- `Design`
- `GitHub Projects`

同时明确：

- 候选书架 ≠ 已激活书架，需满足激活判据（数量 + 主题集中度）才注册进 `master.md`
- `Best Practice` 不是第一层 topic，而是跨书架视角
- 第一层目录的职责是导航，不是搜索
- “找不到”优先解释为知识库缺口，而不是 fallback search 的理由
- 书架页分两阶段成长：扁平 → 四卡片，由内容规模驱动
- Query protocol 只在 `master.md` 定义一次，书架页不重复
- Gaps 必须保持克制、可导航，不是 lint 的垃圾桶

## 后续待设计

下一步需要继续设计：

1. 每个主书架下的具体卡片内容模板
2. 何时允许新增候选书架
3. 何时允许某个主书架长出更细的子层级
4. 激活状态和阶段状态如何映射成 master.md 和 by-topic 的具体写入策略

已在本文档中完成：

- ~~`_index/by-topic/` 的文件结构~~（见"by-topic 设计方向"）
- ~~compile 如何为新来源分配主书架~~（见"Compile 归类协议"）
- ~~compile 如何检测书架激活阈值并自动注册~~（见"激活规则"+"归类协议第三层"）
- ~~quickCompile / 深度 compile 的职责边界~~（见"Compile 代码分工"）
- ~~source frontmatter contract~~（见"Source Frontmatter Contract"）
- ~~quickCompile prompt 设计与输入上下文最小集~~（见"quickCompile Prompt 设计"）
- ~~深度 compile 聚合流程与读取策略~~（见"深度 Compile 聚合设计"）
- ~~compile 如何触发书架页从阶段一到阶段二的过渡~~（见"聚合流程第 3 步"）
- ~~Recent Activity 的自动维护机制~~（见"Recent Activity 治理规则"+"聚合流程第 4 步"）

## Compile 归类协议

### 核心原则

Compile 归类的目标不是"尽快分类完整"，而是：

- 保守归类，优先保证误归类少
- 允许 source 暂时处于"已编译但未归架"状态
- 先归 source，再评估 shelf——不是先定 shelf 再硬塞 source

### 三层归类流程

#### 第一层：Source 级判断——这篇 source 在说什么

这一层不回答"它属于哪个书架"，只回答 source 本身的内容特征。

输出结构：

```json
{
  "source_path": "sources/...",
  "primary_subject": "harness design for long-running AI agents",
  "secondary_subjects": ["evaluator loops", "tool use discipline"],
  "source_type": "engineering_practice",
  "confidence": "high",
  "candidate_shelves": [
    {
      "name": "AI Agent Systems",
      "confidence": "high",
      "reason": "Focuses on harnesses, evaluator loops, and agent engineering practice."
    },
    {
      "name": "GitHub Projects",
      "confidence": "low",
      "reason": "Mentions an open-source implementation, but the main subject is not the project itself."
    }
  ],
  "recommended_shelf": "AI Agent Systems"
}
```

关键规则：

- 每篇 source 只有一个 `recommended_shelf`，但可以保留多个 `candidate_shelves`
- `candidate_shelves` 可以为空列表——如果没有足够强信号支撑任何书架
- `recommended_shelf` 可以为 `null`——source 进入"已编译但未归架"状态

#### 第二层：Shelf 候选判断——它最可能支持哪个书架

**可以直接归入某候选书架的情况**：

- 主题非常明确，与该书架的职责边界高度吻合
- 不主要依赖来源形态判断

例如：

- 讲 harness / evaluator loop / agent engineering 实践 → AI Agent Systems
- 讲 model training / benchmark / reasoning behavior → LLM Models

**不应该直接归入某书架的情况**：

- 只是来源长得像某类东西
- 同时落在两个书架边界上，且无法分出主次
- 内容太稀薄，只能看出来源对象，不能看出知识主题

#### 第三层：Shelf 激活判断——候选书架是否已成为有效导航区

这是跨多篇 source 的聚合判断，不是单篇 source 的属性。

判断依据：

- 数量门槛（见"激活规则"）
- 主题集中度
- 是否已出现 concept / map 候选
- 对 query 是否已形成可导航入口

### 归类判据规则

#### 强信号（可独立决定书架归属）

- `primary_subject` 与某书架职责边界直接吻合
- 这种吻合体现在标题、摘要或核心段落，而不是零散提及
- source 使用了该书架已有的 concept / 术语体系
- source 能直接支撑该书架已知 gap

#### 弱信号（可辅助判断，不能单独决定）

- 作者或机构背景（如 Anthropic 的文章大概率 AI 相关，但可能讲的是 model 而非 agent）
- 顺带提及某书架术语，但不以此为主题
- 与某书架近期 activity 有时间关联

#### 禁用信号（不能作为归类依据）

- URL 域名或来源形态（github.com ≠ GitHub Projects，arxiv.org ≠ LLM Models）
- 文件格式（PDF ≠ 学术论文 ≠ 任何特定书架）
- 篇幅长短
- 既有归类惯性（不能因"上一篇类似的归了这个书架"就自动跟随）

#### 反向排除

当某篇 source 对一个书架有弱或中等匹配，但对另一个书架有更直接、更排他的主题匹配时，应优先归入后者。

例如：

- 来自 Anthropic 但全文讲 benchmark 设计 → LLM Models，不是 AI Agent Systems
- GitHub repo README 但核心讲 transformer 推理优化 → LLM Models，不是 GitHub Projects

### 归类判断顺序

1. 看内容主题（标题、摘要、核心段落），不看 URL 形态
2. 判断是否能形成稳定的 `primary_subject`
3. 生成 1 到 3 个 `candidate_shelves`（可以为空）
4. 检查反向排除：是否存在更强的排他性匹配
5. 只选 1 个 `recommended_shelf`（可以为 null）
6. 后续聚合时再决定该书架是否激活

### 特殊书架规则：GitHub Projects

GitHub Projects 不是"来自 GitHub 的内容区"，而是"以项目为研究对象的内容区"。

准入条件：

- source 的主要对象是某个具体项目的架构、演进、实现选择、维护实践
- 如果 source 讨论的是从项目中抽象出的通用方法论，应优先归入对应学科书架（如 AI Agent Systems、LLM Models）

### 未归架状态

- 如果没有足够强信号支撑任何书架，`candidate_shelves` 为空，source 保持"已编译但未归架"
- 这不是错误，是正常状态
- 未归架 source 的用途：
  - 作为"是否需要新候选书架"的信号——当多篇未归架 source 共享相似主题时，可能意味着需要新书架
  - 作为现有书架边界调整的信号
  - lint 应定期检查未归架 source，报告聚类趋势

### Compile 代码分工

#### quickCompile

职责只到 source 级，不做书架激活。

负责：

- 生成 `sources/<slug>.md`（source summary + 归类 frontmatter）
- 对单篇 source 做内容理解
- 产出归类元信息（primary_subject、source_type、candidate_shelves、recommended_shelf）
- 如果没有足够强信号，recommended_shelf = null

不负责：

- 激活书架
- 生成或更新 by-topic 文件
- 维护 Recent Activity

代码位置：沿用 `src/commands/compile.ts` 现有 quick compile 逻辑。

#### 深度 compile

职责是跨篇聚合与目录生长。

负责：

- 扫描所有 `wiki/sources/*.md` 的 frontmatter，汇总归类元信息
- 判断候选书架是否满足激活判据
- 生成或更新 `_index/master.md`
- 生成或更新 `_index/by-topic/<slug>.md`
- 判断书架处于阶段一还是阶段二
- 维护 Recent Activity
- 维护结构性 Gaps

代码位置：沿用 `src/commands/compile.ts` 现有 deep compile 逻辑。

#### index-updater.ts

`src/pipeline/index-updater.ts` 当前负责 master.md 维护，后续扩展为同时负责：

- 更新 `_index/master.md`
- 写入 `_index/by-topic/*.md`

第一版不拆分模块，避免过度重构。

#### 关键实现原则

- quickCompile 写"判断结果"（source frontmatter 里的归类元信息）
- 深度 compile 写"结构结果"（index 文件里的目录结构）
- 这两层不要混：source 文件记录"这篇看起来像哪个书架"，index 文件记录"哪些书架已成为正式导航入口"

### Source Frontmatter Contract

归类元信息写入每篇 `sources/*.md` 的 YAML frontmatter。

#### 必填字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `kind` | string | 固定为 `source` |
| `title` | string | source summary 的标题 |
| `source_type` | string | 单篇来源的内容类型（不直接决定书架） |
| `primary_subject` | string | 这篇 source 的主要主题描述 |
| `candidate_shelves` | string[] | 候选书架名称列表，可为空 |
| `recommended_shelf` | string \| null | 推荐书架，可为 null |
| `unassigned` | boolean | 是否处于"已编译但未归架"状态 |

#### 可选字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `shelf_confidence` | string | `high` \| `medium` \| `low` |
| `classification_reason` | string | 一句简短解释，方便 debug 和 lint |

#### source_type 枚举

第一版控制在少量稳定值：

- `engineering_practice`
- `technical_report`
- `paper`
- `discussion`
- `project_documentation`
- `market_note`
- `design_reference`
- `other`

此字段帮助理解 source，不直接决定书架归属。

#### candidate_shelves 格式

第一版使用字符串数组，不使用嵌套对象：

```yaml
candidate_shelves:
  - AI Agent Systems
  - GitHub Projects
recommended_shelf: AI Agent Systems
```

原因：YAML 复杂度低、frontmatter 不会变重、deep compile 第一版不需要更细粒度。如果后续确实需要 per-shelf confidence 和 reason，再升级为对象数组。

#### 一致性规则

1. 如果 `recommended_shelf` 为 null → `unassigned` 必须为 `true`
2. 如果 `recommended_shelf` 非空 → `unassigned` 必须为 `false`，且 `recommended_shelf` 应出现在 `candidate_shelves` 中
3. `candidate_shelves` 可以为空列表，这是合法状态

#### 完整示例

已归架：

```yaml
---
kind: source
title: Harness Design for Long-running Application Development
source_type: engineering_practice
primary_subject: harness design for long-running ai agents
candidate_shelves:
  - AI Agent Systems
  - GitHub Projects
recommended_shelf: AI Agent Systems
unassigned: false
shelf_confidence: high
classification_reason: The source focuses on harness design, evaluator loops, and agent engineering practice; the repository/project context is secondary.
---
```

未归架：

```yaml
---
kind: source
title: Miscellaneous Notes on Tooling
source_type: discussion
primary_subject: mixed notes on developer tooling and workflows
candidate_shelves: []
recommended_shelf: null
unassigned: true
shelf_confidence: low
classification_reason: No single bookshelf has enough strong signals; the source remains compiled but unassigned.
---
```

### quickCompile Prompt 设计

#### 目标

输入单篇 `markdown/*.md`，输出一篇 `wiki/sources/<slug>.md`，包含稳定 frontmatter 和可读的 source summary body。

#### 输出结构

quickCompile 要求模型同时产出两部分：

1. **frontmatter**：按 Source Frontmatter Contract 生成结构化归类
2. **body**：人类和 query 可读的 source summary

body 建议结构：

```md
# Summary

...

# Key Points

- ...
- ...

# References

- Original markdown: [[markdown/source-slug]]
- Original URL: https://... (if available)
```

References 的最低要求：必须包含指向原始 `markdown/` 来源路径的链接。如果原始 URL 可得（如 ingest 时记录），也应补充。这不是占位节——后续 query 和 deep compile 回读时需要区分"原始来源"与"编译产物路径"。

重点不是 body 的章节名字，而是 frontmatter 必须可预测、稳定、易解析。

#### Prompt 约束

quickCompile prompt 应明确要求模型：

- 先理解这篇 source 的主要主题
- 按 Source Frontmatter Contract 生成 frontmatter
- 保守归类：`recommended_shelf: null` 是合法且鼓励的保守输出
- 不允许用 URL 域名、文件格式、篇幅长短来决定书架
- `candidate_shelves` 最多 3 个
- `recommended_shelf` 最多 1 个
- `classification_reason` 必须短，聚焦主题，不复述全文

#### 防漂规则

1. **`primary_subject` 必须是一句话主题，不是标签列表**
   - 对：`harness design for long-running ai agents`
   - 不对：`agents, harness, evaluation, github, workflow`

2. **`candidate_shelves` 只能列主题区，不列"看起来像"**
   - 不能仅因 source 来自 github.com 就列 GitHub Projects

3. **`classification_reason` 只解释归类，不解释内容摘要**

#### 输入上下文最小集

quickCompile 的上下文应服务 3 个判断：这篇 source 的 primary_subject 是什么、是否与某书架职责边界直接吻合、是否足够强到推荐 recommended_shelf。

**默认输入**（每次必给）：

| 输入 | 用途 |
|------|------|
| 当前 source 的 markdown 全文 | 主体内容 |
| SCHEMA.md 中的候选书架职责边界片段 | 归类映射的唯一权威源 |

SCHEMA.md 是候选书架定义的唯一真相源。quickCompile 从 SCHEMA.md 中提取候选书架职责边界片段作为输入，不另外维护独立的摘要文件。这避免双真相源导致的不一致。

提取的片段应为精简格式：

```
- AI Agent Systems: agent architecture, harnesses, workflows, tool use, evaluation loops, engineering practice
- LLM Models: training, alignment, inference, reasoning, benchmarks, capabilities
- Trading: stock trading, strategy, execution, market structure, risk management
- Design: UI/UX, web design, interaction patterns, visual systems, frontend experience
- GitHub Projects: specific project architecture, evolution, implementation choices, maintenance practice
```

如果 SCHEMA.md 的格式变化，提取逻辑应随之调整，但不要另建一份手写摘要。

**条件输入**（有帮助但不默认全量给）：

| 输入 | 条件 | 用途 |
|------|------|------|
| 已激活书架列表 | 存在已激活书架时 | 弱辅助，让模型知道哪些区是活的 |
| 核心 concept 术语表 | 已有 concepts 时 | 识别术语体系关联（只给名称列表，不给整篇） |
| 极简 gaps 摘要 | 已有 gaps 时 | 识别"source 能否直接支撑某个 gap" |

**不输入**：

| 不给 | 原因 |
|------|------|
| 全量 master.md | 含 Recent Activity / query protocol，对单篇归类帮助有限，可能制造归类惯性 |
| by-topic/*.md 全文 | 深度结构层，不是单篇必需上下文 |
| 其他 source summaries | 避免"参考已有风格"放大历史错误 |

#### Prompt 构造顺序

```
1. 任务说明（你是 quickCompile，目标是...）
2. Source Frontmatter Contract（必填/可选字段定义）
3. 候选书架职责边界摘要
4. [可选] 已激活书架核心术语 / Gaps 摘要
5. Source markdown 内容
```

模型先按协议思考，再看原文。

### 深度 Compile 聚合设计

#### 核心原则

深度 compile 不是重新读全库做一次大脑，而是先读结构化归类结果，再在必要时回读正文。它是"聚合器"，不是第二个自由问答 agent。

#### 最小读取集

**第一层：默认只读 frontmatter**

每篇 `sources/*.md` 读取以下字段：

- `title`、`source_type`、`primary_subject`
- `candidate_shelves`、`recommended_shelf`
- `unassigned`、`shelf_confidence`、`classification_reason`

这是聚合的主输入。

**第二层：按需回读 body**

只在以下情况回读正文摘要：

- 某个书架边界模糊，需要更多证据
- 同一书架下的 `primary_subject` 看起来发散
- 某 source 的 `recommended_shelf` 和聚合趋势冲突
- 准备抽 concept / map，但 frontmatter 不够支撑

body 不是默认输入，而是冲突解决材料。

#### 聚合流程（4 步）

**第 1 步：收集 source 状态**

将所有 source 分为三类：

1. **已归架**：`recommended_shelf != null`
2. **未归架**：`unassigned = true`
3. **异常状态**：frontmatter 不一致、`recommended_shelf` 不在 `candidate_shelves` 中、缺字段

先做健康检查，再做结构生长。

**第 2 步：按 recommended_shelf 聚合**

对每个候选书架统计：

- 归到该书架的 sources 数量
- `primary_subject` 的收敛程度
- `source_type` 分布（仅作描述性统计和辅助分析，不可单独触发书架激活或升级）
- 是否已出现稳定 concept 候选
- 是否已出现可写成 map 的材料

建议中间数据结构：

```typescript
type ShelfAggregate = {
  shelf: string
  sourceCount: number
  sourcePaths: string[]
  primarySubjects: string[]
  sourceTypes: string[]
  unassignedRelatedCount: number
  hasConceptCandidates: boolean
  hasMapCandidates: boolean
  activationStatus: 'inactive' | 'active_stage1' | 'active_stage2' | 'degrading'
  notes: string[]
}
```

**第 3 步：判断生命周期状态**

每个候选书架进入以下状态之一：

| 状态 | 含义 |
|------|------|
| `inactive` | 未达到激活条件 |
| `active_stage1` | 已激活，扁平书架页，无稳定 concepts/maps |
| `active_stage2` | 已激活，具备四卡片结构条件 |
| `degrading` | 可能需要从 master.md 移除，暂不自动执行 |

激活判断（inactive → active_stage1）：

1. 有足够数量的 `recommended_shelf == 该书架` 的 source
2. 这些 source 的 `primary_subject` 明显围绕同一主题区
3. 不只是来源形态相似
4. 多篇 source 能支持一段一致的书架简介，且至少存在一组核心 source 可直接列入阶段一书架页

阶段升级判断（active_stage1 → active_stage2）：

1. 已出现可独立成文的 concept 或 map 候选
2. source 不再只是若干平行摘要，而是已能形成高层组织

**第 4 步：写目录结果**

根据状态更新：

- `_index/master.md`（只含 active 书架）
- `_index/by-topic/<slug>.md`（阶段一或阶段二模板）
- Recent Activity（只记录结构性变化）
- shelf-level Gaps

#### 未归架 source 在聚合中的作用

未归架 source 不被忽略，参与两个判断：

1. 是否提示"存在新候选书架趋势"（多篇未归架 source 共享相似主题）
2. 是否提示"现有书架边界需要调整"

但它们不直接进入 master.md，是结构信号而非导航入口。

#### 深度 compile 不回写 source frontmatter

深度 compile 不应因聚合需要而反过来重写单篇 source 的 `recommended_shelf`。

原因：

- frontmatter 不再是稳定接口
- compile 结果会不断回流覆盖 quickCompile 的原判断

如果确实需要修正某篇 source 的归类，应走显式修正步骤（如 lint 建议 + 人工确认），而不是聚合时偷偷改。

## `_index/by-topic/` 设计方向

每个已激活书架在 `_index/by-topic/` 下有一个同名文件（如 `ai-agent-systems.md`），作为 query 进入该书架的固定入口。

文件内容随书架阶段不同而不同：

- **阶段一**：扁平书架页（书架简介 + Sources + Gaps），见前文”阶段一”模板
- **阶段二**：四卡片书架页（When To Use / Reading Order / Maps / Concepts / Sources / Gaps / Related Shelves / Query Notes）

无论哪个阶段，`by-topic` 文件的核心职责不变：

- 告诉 agent 什么时候使用这个书架
- 列出当前可用的材料
- 暴露当前的知识缺口
- 在需要时提供跨书架跳转（阶段二）

## `AI Agent Systems` 书架页样板

建议样板：

```md
# AI Agent Systems

> Bookshelf index for AI agent concepts, harnesses, workflows, evaluation loops, and engineering practice.

## When To Use This Shelf

Use this shelf for questions about:
- AI agent architecture
- Harness design
- Planner / generator / evaluator workflows
- Tool use discipline
- Evaluation loops
- Agent engineering practice

## Reading Order

1. Start with `Maps` for overview, comparison, and how-to questions.
2. Go to `Concepts` for term definitions and boundaries.
3. Use `Sources` for evidence, attribution, and original claims.
4. Check `Gaps` if the shelf does not contain enough material.

## Maps

### Core Maps
- [[maps/ai-agent-systems/harness-design-overview]]
- [[maps/ai-agent-systems/agent-evaluation-patterns]]
- [[maps/ai-agent-systems/multi-agent-workflow-comparison]]

### Emerging Maps
- [[maps/ai-agent-systems/tool-use-discipline]]
- [[maps/ai-agent-systems/long-running-agent-failures]]

## Concepts

### Core Concepts
- [[concepts/ai-agent-systems/harness]]
- [[concepts/ai-agent-systems/context-anxiety]]
- [[concepts/ai-agent-systems/self-evaluation-bias]]
- [[concepts/ai-agent-systems/generator-evaluator-loop]]

### Related Concepts
- [[concepts/ai-agent-systems/sprint-contracts]]
- [[concepts/ai-agent-systems/tool-use-discipline]]

## Sources

### Canonical Sources
- [[sources/harness-design-for-long-running-application-development]]
- [[sources/designing-ai-resistant-technical-evaluations]]
- [[sources/andrej-karpathy-karpathy]]

### Additional Sources
- [[sources/...]]
- [[sources/...]]

## Gaps

- Harness-related sources exist, but concept coverage is still incomplete.
- Evaluation-loop material exists, but comparison maps are sparse.
- Official engineering-practice sources are growing, but not yet synthesized into stable maps.

## Related Shelves

- [[_index/by-topic/llm-models]]
- [[_index/by-topic/github-projects]]

## Query Notes

See `_index/master.md` Query Protocol for general navigation rules.
Shelf-specific note: if only `Sources` exist and no `Maps/Concepts` exist, answer conservatively.
```

## 通用 `by-topic` 模板原则

当前判断：所有主书架页都应尽量使用同一模板，只允许少量内容层面的差异，不要每个书架发明自己的目录语法。

统一结构建议（成熟书架页，即阶段二）：

1. `When To Use This Shelf`
2. `Reading Order`
3. `Maps`
4. `Concepts`
5. `Sources`
6. `Gaps`
7. `Related Shelves`
8. `Query Notes`（仅本书架特有的说明，通用规则引用 master.md）

扁平书架页（阶段一）只需要：

1. 书架简介（一行描述）
2. `Sources`（直接列条目）
3. `Gaps`（简短缺口说明）

### 为什么要统一模板

- query 行为更稳定
- compile 更容易维护
- lint 更容易检查目录是否完整
- agent 不需要为每个 topic 学一套新结构

### 允许变化的部分

- 每个书架的 `Focus` 与 `When To Use This Shelf`
- `Maps / Concepts / Sources / Gaps` 下的具体条目
- `Related Shelves` 的跨书架跳转

### 不建议变化的部分

- 一级 section 名称
- section 顺序
- query 指南的基本语义

否则 `_index/by-topic/` 很快会退化成一组风格各异、难以导航的自由文档。
