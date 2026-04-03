# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

独立 CLI 知识管理工具，基于 Karpathy 的 LLM Wiki 方法论。将零散原始信息源编译为结构化、可查询、可关联的知识体系。底层通过 Pi agent 与 LLM 交互。

**不是** omp skill，但可调用 omp 工具（如 web-operator）。未来有独立产品化潜力。

## Architecture

### 四级数据管线

```
raw/ → markdown/ → wiki/ → Agent Q&A
存证层    提取层(汇聚点)  知识层    交互层
```

### Wiki 三层结构（图书馆模型）

```
wiki/
├── SCHEMA.md        # 书架布局图（LLM 维护）
├── sources/         # 来源摘要（1:1 对应 markdown/）
├── concepts/        # 概念文章（跨源综合）
├── maps/            # 地图（主题综述、时间线、对比分析）
└── _index/          # 目录卡片柜（分层索引，按需加载）
    └── master.md    # 全局索引（LLM 第一个读的文件）
```

### 数据目录（运行时）

```
~/.local/share/kb-agent/       # KB_AGENT_DATA_DIR 环境变量覆盖
├── raw/                       # 二进制原始文件（PDF/docx/图片）
├── markdown/                  # 所有内容的 .md 化（汇聚点）
├── wiki/                      # Obsidian 兼容知识库（可作为独立 vault）
└── config.json
```

### Agent + Skill

单 agent（**librarian**），按任务装备不同 skill（ingest / compile / search / lint）。

## CLI

```
kb-agent <subcommand> [options]

子命令: init | ingest | compile | lint | query | chat
LLM 通用参数: --model <model>  --mode text|stream|json|interactive
```

## Tech Stack

- **Language**: JavaScript/TypeScript
- **LLM**: Pi RPC（参考 `~/Projects/minora-ui/` team lead）
- **CLI --mode/--model**: 需工程化，参考 `~/Projects/oh-my-superpowers/bin/omp`

## Project Structure

```
knowledge-agent/
├── bin/kb-agent
├── src/commands/
├── src/pipeline/
├── agents/librarian.md
├── skills/{ingest,compile,search,lint}/
├── docs/
├── tests/
└── package.json
```

## Key Documents

- [Design Doc](docs/brainstorming/specs/2026-04-03-knowledge-agent-design.md) — 完整设计文档（定位、数据架构、CLI、Agent/Skill、Roadmap）
- [Karpathy LLM Wiki 工作流](docs/karpathy-llm-wiki-workflow.md) — 核心方法论参考
- [Origin Idea](docs/origin-idea.md) — 项目初心（注：架构草图已被 design.md 取代）

## Reference Projects

- `~/Projects/minora-ui/` — Pi RPC 集成、前端风格、markdown 渲染
- `~/Projects/oh-my-superpowers/` — CLI 设计体系、--mode/--model 工程化
- Obsidian vault 中 pi-coding-agent 相关研究成果
