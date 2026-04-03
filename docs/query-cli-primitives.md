# Query CLI Primitives

> 定义 knowledge-agent 的查询原语层。目标不是立刻实现所有命令，而是先稳定查询协议，围绕目录系统来导航知识库，而不是把整个 wiki 当搜索引擎来扫描。

## 背景

当前 `query` 已具备可用性，但仍有几个结构性问题：

- 查询路径不稳定，容易过早退化成全文搜索
- `SCHEMA.md` / `_index/master.md` 的导航地位没有被稳定执行
- `maps/` / `concepts/` / `sources/` 的知识层级没有体现在工具层
- 回答质量、引用纪律和调试体验过度依赖 prompt，而不是协议

因此需要在 agent 与知识库目录系统之间引入一层稳定的 **CLI 查询原语**。

## 设计目标

这组命令的职责不是“直接给最终答案”，而是：

- 为 agent 提供结构化的知识库导航入口
- 将“目录导航”和“证据读取”分离
- 显式暴露知识层级：`maps` / `concepts` / `sources`
- 让 query 行为优先信任 index，而不是依赖全库扫描
- 让 query 行为更可调试、更可解释

## 设计原则

1. **协议优先**
   - 命令的输入输出 contract 应长期稳定
   - 原语的职责是表达图书馆导航协议，而不是暴露搜索引擎接口

2. **目录优先**
   - 先信任 `SCHEMA.md` 和 `_index/`
   - 如果目录系统找不到入口，就应视为知识库缺口，而不是搜索失败

3. **导航与阅读分离**
   - `index` / `links` 负责定位
   - `article` / `evidence` 负责读取和规范化单个知识单元

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

### `kb-agent index [path]`

用途：读取 `_index/master.md` 或指定 index 文件，提供目录层入口。

职责：

- 读取某个 index 文件
- 返回该 index 文件包含的 links、topic headings、摘要信息
- 让 agent 沿目录系统逐层进入具体文章

非职责：

- 不做全文搜索
- 不直接给最终回答

### `kb-agent article <path>`

用途：读取单篇 wiki 文章，保留接近原文的视图。

职责：

- 输入一篇 article 的路径
- 返回 article 的基本信息与内容
- 用于 index 已经定位到文章之后的直接阅读

非职责：

- 不做候选召回
- 不做跨文档综合

### `kb-agent links <path>`

用途：提取一篇文章里的 wikilinks，支持沿文内链接继续导航。

职责：

- 输入一篇 article 的路径
- 返回其链接到的 `maps` / `concepts` / `sources`
- 让 query 可以从 index 进入文章后继续扩展阅读

非职责：

- 不读取全文
- 不做候选召回

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

### `kb-agent inspect <question>`

用途：解释某次 query 是如何沿目录系统导航的，服务调试和评估。

职责：

- 返回导航路径
- 返回访问过的 index / article paths
- 返回为什么认定知识库足够或不足
- 为 query 行为提供可观测面

非职责：

- 不输出最终答案
- 不替代实际导航命令

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

### `index`

```json
{
  "path": "_index/master.md",
  "title": "Master Index",
  "links": [
    "sources/2039805659525644595.md",
    "concepts/example.md"
  ]
}
```

### `article`

```json
{
  "path": "sources/harness-design-for-long-running-application-development.md",
  "kind": "source",
  "title": "Harness Design for Long-running Application Development",
  "content": "..."
}
```

### `links`

```json
{
  "path": "sources/harness-design-for-long-running-application-development.md",
  "wikilinks": [
    "concepts/harness-agent",
    "concepts/evaluator-loop"
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
  "question": "Harness Agent 设计",
  "navigation_trace": [
    "Read nav state.",
    "Read _index/master.md.",
    "Opened sources/harness-design-for-long-running-application-development.md."
  ],
  "visited_paths": [
    "_index/master.md",
    "sources/harness-design-for-long-running-application-development.md"
  ],
  "result": "insufficient_index_coverage"
}
```

## Query 执行协议

理想中的 `query` 应遵循这条路径：

1. 调用 `nav`
2. 根据知识库成熟度决定查询深度
3. 读取 `_index/master.md` 或其他 index
4. 进入相关 `maps/` / `concepts/` / `sources/` 文章
5. 必要时沿 `wikilinks` 再继续导航
6. 对最终使用的文章调用 `evidence`
7. 由 LLM 输出：
   - `Answer`
   - `References`
   - `Notes`

## 与当前原始工具的关系

短期内，`ls` / `read` / `bash` 仍然可以保留：

- 作为实现这些查询原语的底层能力
- 作为定向读取和调试手段

但长期不应让 agent 直接把它们当作全库搜索接口。

## 演进路线

### 阶段 1：Library-first navigation

- `nav` + `index` + `article` + `links` 形成主要 query 路径
- 不引入全库搜索式 primitive

### 阶段 2：Richer indexes

- `_index/` 层变得更丰富
- 目录系统更细，减少 query 时的歧义

### 阶段 3：Knowledge-aware evidence

- `evidence` 提供更强的标准化证据视图
- `inspect` 解释导航路径与知识缺口

## 当前结论

短期内最关键的不是引入更强检索引擎，而是先稳定目录导航协议。

优先级建议：

1. 已实现 `nav`
2. 已实现 `evidence`
3. 然后实现 `index`
4. 然后实现 `article`
5. 再实现 `links`
6. `inspect` 可稍后补上

只有当这层目录协议稳定后，才值得讨论更复杂的辅助机制。
