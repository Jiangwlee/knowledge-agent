# Query CLI Primitives

> 定义 knowledge-agent 的查询原语层。目标不是立刻实现所有命令，而是先稳定查询协议，避免 agent 直接退化为 `find` / `grep` / `ls` / `read` 的文件系统乱搜。

## 背景

当前 `query` 已具备可用性，但仍有几个结构性问题：

- 查询路径不稳定，容易过早退化成全文搜索
- `SCHEMA.md` / `_index/master.md` 的导航地位没有被稳定执行
- `maps/` / `concepts/` / `sources/` 的知识层级没有体现在工具层
- 回答质量、引用纪律和调试体验过度依赖 prompt，而不是协议

因此需要在 agent 与底层检索实现之间引入一层稳定的 **CLI 查询原语**。

## 设计目标

这组命令的职责不是“直接给最终答案”，而是：

- 为 agent 提供结构化的知识库导航入口
- 将“候选召回”和“证据读取”分离
- 显式暴露知识层级：`maps` / `concepts` / `sources`
- 为未来的 lexical / hybrid / vector retrieval 保留稳定接口
- 让 query 行为更可调试、更可解释

## 设计原则

1. **协议优先，算法可替换**
   - 命令的输入输出 contract 应长期稳定
   - 底层实现可以从 filesystem 升级到 BM25、hybrid、vector

2. **结构优先，内容补充**
   - 优先利用 `_index/`、路径、标题、wikilinks 等结构信号
   - 内容检索用于补召回，而不是替代知识层级

3. **召回与阅读分离**
   - `lookup` 只返回候选知识单元
   - `evidence` 负责读取和规范化单个知识单元

4. **证据优先于答案**
   - 原语层不直接生成最终回答
   - 最终回答仍由 LLM 基于候选与证据综合生成

## 命令职责

### `kb-agent nav`

用途：提供知识库导航入口状态，强制 agent 从正确入口开始。

职责：

- 返回 `SCHEMA.md` 和 `_index/master.md` 的入口位置
- 返回 `sources` / `concepts` / `maps` 的计数
- 返回知识库成熟度信号，例如：
  - `sources_only`
  - `has_concepts`
  - `has_maps`
- 帮助 agent 判断是否需要降级到 source-summary 模式

非职责：

- 不执行全文检索
- 不返回最终答案

### `kb-agent lookup <query>`

用途：根据查询召回候选知识单元。

职责：

- 接受自然语言 query 或短 topic
- 返回分层候选结果：
  - `maps`
  - `concepts`
  - `sources`
- 每条候选带最小解释信息：
  - `path`
  - `title`
  - `score`
  - `match_reason`
- 允许未来切换 retrieval backend，但保持返回结构不变

非职责：

- 不读取完整文章正文
- 不直接给最终回答

### `kb-agent evidence <path>`

用途：读取单个知识单元，并返回标准化证据。

职责：

- 输入一篇 article 的路径
- 返回：
  - `kind` (`map` / `concept` / `source`)
  - `title`
  - `summary`
  - `wikilinks`
  - `content`
- 帮助 agent 对单篇文章做快速判断和必要细读

非职责：

- 不做候选召回
- 不做跨文档综合

### `kb-agent inspect <query>`

用途：解释某次查询为什么命中这些候选，服务调试和评估。

职责：

- 返回 query 的召回策略
- 返回命中的 decision trace
- 返回被选中的 article paths
- 为未来 hybrid/vector 检索提供可观测面

非职责：

- 不输出最终答案
- 不替代 `lookup`

## 最小 JSON Contract

### `nav`

```json
{
  "data_dir": "/home/bruce/.local/share/kb-agent",
  "wiki_dir": "/home/bruce/.local/share/kb-agent/wiki",
  "schema_path": "SCHEMA.md",
  "master_index_path": "_index/master.md",
  "counts": {
    "sources": 12,
    "concepts": 3,
    "maps": 1
  },
  "status": {
    "has_schema": true,
    "has_master_index": true,
    "knowledge_maturity": "sources_only"
  },
  "entrypoints": [
    "SCHEMA.md",
    "_index/master.md"
  ]
}
```

### `lookup`

```json
{
  "query": "Harness Agent 设计",
  "strategy": "filesystem",
  "results": {
    "maps": [],
    "concepts": [],
    "sources": [
      {
        "path": "sources/harness-design-for-long-running-application-development.md",
        "title": "Harness Design for Long-running Application Development",
        "score": 0.91,
        "match_reason": "title"
      }
    ]
  },
  "notes": [
    "No concept or map articles matched."
  ]
}
```

### `evidence`

```json
{
  "path": "sources/harness-design-for-long-running-application-development.md",
  "kind": "source",
  "title": "Harness Design for Long-running Application Development",
  "summary": "Discusses planner-generator-evaluator structure for long-running tasks.",
  "wikilinks": [
    "concepts/harness-agent",
    "concepts/evaluator-loop"
  ],
  "content": "..."
}
```

### `inspect`

```json
{
  "query": "Harness Agent 设计",
  "strategy": "filesystem",
  "decision_trace": [
    "No maps matched.",
    "No concepts matched.",
    "Selected 2 source summaries by title/content match."
  ],
  "selected_paths": [
    "sources/harness-design-for-long-running-application-development.md"
  ]
}
```

## Query 执行协议

理想中的 `query` 应遵循这条路径：

1. 调用 `nav`
2. 根据知识库成熟度决定查询深度
3. 调用 `lookup`
4. 对最相关的 1 到 3 个候选调用 `evidence`
5. 必要时沿 `wikilinks` 再补一轮 `evidence`
6. 由 LLM 输出：
   - `Answer`
   - `References`
   - `Notes`

## 与当前原始工具的关系

短期内，`find` / `grep` / `ls` / `read` 仍然可以保留：

- 作为实现这些查询原语的底层能力
- 作为降级路径和调试手段

但长期不应让 agent 直接把它们当作主要 query interface。

## 演进路线

### 阶段 1：Filesystem-first

- `lookup` 主要依赖路径、标题、frontmatter、wikilinks、全文匹配
- 不引入外部检索基础设施

### 阶段 2：Hybrid lexical retrieval

- 在 `lookup` 内部加入更稳定的倒排索引 / BM25
- 保持 CLI contract 不变

### 阶段 3：Vector-backed lookup

- 在 `lookup` 内部加入 semantic retrieval
- 结构信号仍保留并参与重排
- `maps` / `concepts` / `sources` 的层级返回不变

### 阶段 4：Knowledge-aware retrieval

- 根据 query intent 决定更偏向 `maps` / `concepts` / `sources`
- `inspect` 用于解释为什么选择该路径

## 当前结论

短期内最关键的不是引入更强检索引擎，而是先稳定查询协议。

优先级建议：

1. 已实现 `nav`
2. 已实现 `lookup`
3. 已实现 `evidence`
4. `inspect` 可稍后补上

只有当这层协议稳定后，引入 BM25、hybrid 或 vector backend 才不会把系统复杂度提前拉高。
