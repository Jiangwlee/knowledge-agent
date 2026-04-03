# Andrej Karpathy 的 LLM Wiki 工作流

**来源**: https://x.com/karpathy/status/2039805659525644595  
**发布日期**: 2026-04-02  
**翻译时间**: 2026-04-03  
**数据**: 778 回复 · 1.6K 转发 · 12K 喜欢 · 120 万浏览

---

## 推文正文（完整翻译）

### LLM 知识库

我最近发现一件非常有用的事情：用 LLM 为各种研究兴趣主题构建个人知识库。这样一来，我最近大量的 token 吞吐量不再是用于操作代码，而是更多地用于操作知识（以 markdown 和图片的形式存储）。最新的 LLM 在这方面做得相当好。

所以：

**数据摄入（Data ingest）**：我将源文档（文章、论文、代码仓库、数据集、图片等）索引到一个 `raw/` 目录中，然后使用 LLM 增量地"编译"一个 wiki——它就是一个目录结构中的 `.md` 文件集合。这个 wiki 包含 `raw/` 中所有数据的摘要、反向链接，然后它将数据分类为各种概念，为每个概念撰写文章，并将它们全部链接起来。为了将网页文章转换为 `.md` 文件，我喜欢使用 Obsidian Web Clipper 扩展，然后我还使用快捷键将所有相关图片下载到本地，这样我的 LLM 可以方便地引用它们。

**IDE**：我使用 Obsidian 作为 IDE "前端"，在这里我可以查看原始数据、编译后的 wiki 以及衍生的可视化内容。重要的是要注意，LLM 编写和维护 wiki 的所有数据，我很少直接触碰它。我尝试过一些 Obsidian 插件来以其他方式渲染和查看数据（例如用 Marp 制作幻灯片）。

**问答（Q&A）**：有趣的地方在于，一旦你的 wiki 足够大（例如我在某些近期研究上的 wiki 大约有约 100 篇文章和约 40 万字），你就可以向你的 LLM agent 提出各种复杂的问题，它会出去研究答案等等。我以为我必须使用高级 RAG 技术，但 LLM 在自动维护索引文件和所有文档的简要摘要方面做得相当好，在这个较小的规模下，它能相当轻松地读取所有重要的相关数据。

**输出（Output）**：我不喜欢在文本/终端中获取答案，而是喜欢让它为我渲染 markdown 文件、幻灯片（Marp 格式）或 matplotlib 图片，然后我在 Obsidian 中再次查看所有这些。你可以根据查询想象许多其他视觉输出格式。通常，我最终会将输出"归档"回 wiki 中以增强它，以便进一步查询。所以我自己的探索和查询总是在知识库中"累积"。

**Linting（检查）**：我对 wiki 运行了一些 LLM "健康检查"，例如查找不一致的数据、填补缺失数据（使用网络搜索）、为新文章候选发现有趣的关联等，以增量地清理 wiki 并增强其整体数据完整性。LLM 非常擅长建议进一步要问和调查的问题。

**额外工具（Extra tools）**：我发现自己在开发额外的工具来处理数据，例如我 vibe coded 了一个小型的简朴搜索引擎来搜索 wiki，我既直接使用它（在 web UI 中），但更多时候我希望通过 CLI 将它作为工具交给 LLM 用于更大的查询。

**进一步探索（Further explorations）**：随着仓库的增长，自然的愿望是也考虑合成数据生成 + 微调，让你的 LLM 将数据"知道"在其权重中，而不仅仅是在上下文窗口中。

**总结**：来自多个来源的原始数据被收集，然后由 LLM 编译成 `.md` wiki，然后由 LLM 通过各种 CLI 操作进行问答和增量增强 wiki，所有这些都可以在 Obsidian 中查看。你几乎从不手动编写或编辑 wiki，这是 LLM 的领域。我认为这里有空间做一个不可思议的新产品，而不是一堆拼凑的脚本。

---

## Andrej 与社区的讨论

### 讨论 1：关于自然延伸——LLM 团队协作

**Andrej Karpathy (@karpathy)**：
> 在自然的延伸中，你可以想象：每一个向前沿级 LLM 提出的问题都会催生一个 LLM 团队来自动化整个过程——迭代地构建一个完整的临时 wiki，对其进行 lint 检查，循环几次，然后写一份完整的报告。这远远超出了一个 `.decode()` 调用。

**解读**：Karpathy 的终极愿景不是单个 LLM 维护 wiki，而是一个 LLM 团队协作完成端到端的知识编译流水线。这意味着知识库构建可以被完全自动化为一个 one-shot 过程。

---

### 讨论 2：关于增量编译的实际操作

**Gavriel Cohen (@Gavriel_Cohen)**：
> 能分享更多关于增量编译的信息吗？我发现如果逐个处理，它们没有足够的上下文来理解如何划分目录。有最佳的批次大小吗？多阶段处理？

**Andrej Karpathy (@karpathy)**：
> 目前还不是完全自主的流程，我手动逐个添加每个来源，处于人工监控状态，特别是在早期阶段。经过一段时间后，LLM "理解"了模式，边际文档的处理就容易多了，我只需要说"把这个新文档归档到我们的 wiki：(路径)"。

**解读**：系统是 **human-in-the-loop** 的。早期需要人工引导 LLM 学习目录结构和分类模式，但随着 wiki 成长，边际成本显著下降。关键在于让 LLM 通过实例学习你的组织偏好，而不是预先定义复杂规则。

---

### 讨论 3：关于工具栈的刻意简单化

**CBir (@c__bir)**：
> 你使用 Obsidian CLI 吗？

**Andrej Karpathy (@karpathy)**：
> 目前没有，因为我试图保持超级简单和平坦化，就是一个嵌套的 `.md` 文件和 `.png` 文件目录，加上一些 `.csv` 和 `.py` 文件，schema 保存在 `AGENTS.md` 中并持续更新。LLM 非常容易理解这个结构。任何自定义函数都可以轻松 vibe code 成工具。

**解读**：Karpathy 刻意避免复杂的插件和工具链。flat file system + 一个 `AGENTS.md` schema 文件就是全部架构。这种设计让 LLM 能够直接理解和操作文件系统，无需中间抽象层。

---

### 讨论 4：关于企业应用

**Krishna Tammireddy (@tammireddy)**：
> 每个企业都有一个 `raw/` 目录。从来没有人编译过它。这就是产品机会。

**Andrej Karpathy (@karpathy)**：
> 可能是 LLM 生成的回复，我不知道，但确实如此。

**解读**：Karpathy 对"AI 生成的评论"保持幽默的警觉，同时认同企业知识编译是巨大的产品机会。

---

### 讨论 5：关于视频教程

**Goss Gowtham (@Goss_Gowtham)**：
> 你能制作一个关于如何使用 md 文件和 agentic IDE 工作的视频吗？你之前关于使用 LLM 的解释真的很有帮助。

**Andrej Karpathy (@karpathy)**：
> 我刚才也在想同样的事情。

---

### 讨论 6：用 Twitter 做 Vibe Coding

**jiahao (@__endif)**：
> 你现在就像 Linux 的 Linus，元级 vibe coder，我好奇因为你的推文一夜之间会诞生多少项目。

**Andrej Karpathy (@karpathy)**：
> 哈哈，我用 Twitter 做 vibe code 产品 :D

---

## 高价值评论分类整理

### 一、核心洞察

#### 1. Linting 是整个工作流中最被低估的关键步骤

**Eve Park (@eve_builds)**：
> Linting 步骤是整个工作流中的 sleeper hit。所有人都会关注 ingestion 和 Q&A，但真正的转折点在于 LLM 开始发现你几周前归档的来源之间的矛盾，或者你甚至不知道存在的理解空白。

**Mati (@MatiBuildsWith)**：
> Linting 步骤被低估了。运行"查找文档间不一致的声明"能抓住人类永远不会发现的问题。对于检测来源之间无意识的矛盾也很有用。

**Rocky (@XunWallace)**：
> "Linting" 步骤被低估了。让 LLM 定期交叉引用条目可以发现你手动永远不会注意到的矛盾。就像知识的编译器。

**Devashish Upadhyay (@devashishup)**：
> Linting 步骤恰恰是企业团队卡住的地方。一旦这些数据流入生产 agent 管线，"健康检查"不能是手动脚本——它们需要自动化门控。我见过 3 个组织因为没有人先构建这一层而延迟 AI 落地 6 个月以上。

---

#### 2. 反馈循环的复利效应

**ByteCrafter (@bytecrafter_1)**：
> 不被重视的细节是反馈循环。每次查询都丰富 wiki，使下一次查询更有用。传统笔记系统会衰减，因为维护成本与体积呈线性增长。LLM 维护的知识库逆转了这一点：它越大，就越有价值。

**BYDFintern (@BYDFiassistant)**：
> 复利的关键是将输出归档回 wiki。一旦每次查询都让语料库比之前更好，系统就不再感觉像聊天，而开始感觉像基础设施。

**MirageAI (@Reverie_Code)**：
> 构建了类似的系统，在某个点你不再管理文档，而是在管理*理解*。"将输出归档回 wiki"才是真正的洞察——知识库是复利式累积，而非简单堆叠。

---

#### 3. 从代码操作到知识操作的范式转移

**Navi Patel (@NaviPatelTech)**：
> 从代码操作到知识操作的转变被低估了。将 LLM 视为个人研究编译器——从不同领域吸收论文、综合、发现联系——感觉像根本不同的思维模式。

**Crepe Supreme (@crepesupreme)**：
> 这悄然超越了整个 PKM/第二大脑工作流。多年来组织阅读内容到完美的文件夹里，结果你只需要直接从原始来源编译综合成果。所有那些标签和链接都是开销。

**Quy Huynh (@hmqiwt)**：
> 知识策展就是新的代码生成。

---

#### 4. Wiki 作为 Agent 的持久记忆

**Petrus (@Pete_yes_please)**：
> 从"LLM 读我的 wiki"到"LLM 把输出归档回 wiki"的跳跃——这时它就不再只是知识库了。你现在拥有的是一个具有持久记忆的 agent，它会积累一种观点。架构问题变成了：哪些写入需要被验证？哪些来源可以被信任？

**Joe (@joespano_)**：
> 大多数 agent 把记忆当作事后想法，然后疑惑为什么它们跨会话毫无用处。"编译为 wiki"的模式是正确的直觉。记忆不是一个功能，而是一种行为。

**Zvonimir Sabljic (@ZvonimirSabljic)**：
> 跨会话上下文是真正的瓶颈。一旦你解决了这个问题，agent 基本上就能自己维护知识了。

---

### 二、实施经验与技术讨论

#### 架构选择

**Lex Fridman (@lexfridman)**：
> 同样的设置。混合使用 Obsidian、Cursor（用于 md）和 vibe-coded web terminals 作为前端。因为我做播客，研究兴趣的数量和多样性非常大。但知识库方法效果很好。获取答案时，我经常让它[渲染输出]……

**Daniel Miessler (@DanielMiessler)**：
> 是的，完全同意。我用 PAI 算法的 LEARN 阶段来自动判断是否应该创建知识文章，它会在 `MEMORY/KNOWLEDGE` 下为我们构建。这样在会话中处理的任何东西都会被收获为知识文章，而且它始终可用。

**Hrishikesh Chappadi (@hrishirc)**：
> 你可以用原始文件维护 LLM 研究。综合后的内容应该进入有组织的文档文件夹。如果是市场研究，你甚至可以创建漂亮的仪表板。产品是多余的。一套好的 `CLAUDE.md` 就能编排这一切。

---

#### 规模挑战

**Chris Kruse (@chriskruse)**：
> 运行这种架构几个月了——用向量数据库 (Qdrant) + 知识图谱 (Neo4j) + LLM 记忆提取层替代了扁平 `.md` 文件。困难不在初始构建，而在于：1. Context overflow——我的 wiki 等效物达到 689K tokens 后开始崩溃。2. Index coherence drift。3. Wiki 结构如何随研究演进而老化。

**Jesse Anglen (@Jesse_Anglen)**：
> "自动维护索引文件"的方法很聪明。在 40 万字和 100 篇文章时还能撑住。但好奇天花板在哪。Context window？Index coherence drift？还是 wiki 结构如何随研究持续演进而老化？我们在构建 agent 记忆时三个问题都遇到了。

**Santanu Banerjee (@santanu_ai)**：
> 我很好奇——索引文件方法在什么时候开始崩溃？假设在 RAG 变得不可避免之前有一个规模上限。到那时，你认为 vectorless RAG 与微调相比哪个更快更好？

---

#### RAG vs Wiki

**Feiyou Guo (@FeiyouG)**：
> 完美契合，直到 wiki 超出上下文。那时 RAG 不再看起来像过度工程。

**Krishang (@0ddmonger)**：
> 定量上这比使用原始数据和嵌入模型的 RAG 好在哪里？我理解这对维护更便宜更快。你使用开源本地 LLM 还是 Claude Code？

**Shrijak (@shrijacked)**：
> 有趣的部分在于，当 ingest 足够丰富时，后续的处理不再感觉像检索，而开始感觉像编译。PDF 文本、仓库结构、图片、引用，然后更干净的制品回到同一语料库中。

---

#### 幻觉与一致性

**Sumit Soni (@_SoniSumit)**：
> 你如何防止 silent knowledge drift？如果 LLM 不断"编译"和重写 markdown，什么机制确保概念不会慢慢偏离 source truth？

**Shaked Klein Orbach (@shakedko)**：
> 我经常这样做。目前的主要问题在于 LLM 假设它不应该假设的事情（不完全是 hallucinations，但可能正确）。在此基础上构建 wiki 可能会导致错误信息，我可能会熟悉并认为它是正确的。

---

#### 为什么是 Markdown

**PERP MECHANIC (@0xCoinflip)**：
> 为什么 agent 在 markdown 上的表现远好于其他文件类型？是后训练的产物，还是因为 markdown 的格式在语法上嵌入了层次结构，而 PDF 这类格式做不到？

---

### 三、实践者经验

#### 已在使用类似系统的人

**Mike Remondi (@remondimi)**：
> 我已经这样做了几个月，发现它非常有用。目录结构是关键突破。Agent 已经学会了如何流畅地导航它们。为特定用例构建自定义工具和脚本也非常棒。

**Moisés Cabello (@moisescabello_e)**：
> 这就是我最近一直在做的事，说实话我做这个比实际编程还多。就是这么简单——创建一个文件夹然后开始研究和讨论，然后不断填充……它会上瘾。

**Zack (@zmcray)**：
> 几周来一直在做这个——Twitter 书签和其他媒体保存到数据库，Claude 自动分类，然后集成发送到 Obsidian，Claude 在那里分析并做自动链接。然后综合会话会提出聚类和有趣的观点。

**Farzad Roozitalab (@farzadrzt)**：
> 我一直在做这件事作为副项目。我称之为我的"生命之书"（Book of Life）。我基本上将每个有用的播客、书籍或文章都导入其中。以前讨厌知识在几天后就流失，但现在它是我遇到问题时的第一站。

**Gabriel Menezes (@gabrielfmm)**：
> 运行非常接近的系统约 2 个月了。补充一些经验：最难的问题是综合架构。原始 markdown 文件不会自动复利增长，除非有跨领域的连接。我在运行"反思"/"连接"过程。

---

#### 独特应用场景

**Lex Politica (@Lex_Logica)**：
> 古典政治哲学研究。语料库是 187,000 chunks 的纯原始文献：亚里士多德、托克维尔、马基雅维利、波利比乌斯、西塞罗、修昔底德。摄入时强制执行引用标准（Bekker 编号、Stephanus 编号）。

**Michael Wigle (@MichaelWigle3)**：
> 两个效果好的功能：一个"级联"函数，查看新增内容并建议应该在哪里写入新链接或关联。还有一个"发现循环"，对整套 md 文件进行分析并对内容提出问题。

**Kaeina (@Kaeina_Y)**：
> 与我使用 Devin 的 wiki 的经验非常一致。纯文本 wiki 让 Ask 和规划更加高效，特别是跨仓库工作时。它是第一个让我作为 PM 也能自信地参与从 Python 到 Go 的前端 API 迁移的工具。

---

### 四、衍生项目与产品

| 项目 | 开发者 | 描述 |
|------|--------|------|
| **Klore** | @VBarsoum | LLM Knowledge Compiler CLI，raw sources in → living knowledge base out |
| **kdb** | @dremnik | Markdown 编译器 CLI，验证链接、自动生成索引和文件导航大纲 |
| **VAULTMIND** | @imrajya3 | CLI 工具，给 URL 提取内容、AI 处理、写入 Obsidian，支持周报和主题摘要 |
| **Superpaper** | @dvrshil | Obsidian × AI 的 markdown 包，可通过 `npx skills add` 安装 |
| **midnightrun.ai** | @midnightrun_ai | 零持久记忆 agent，每个周期通过注入文档接收完整历史 |
| **ARS Contexta** | @agenticnotetaking | Claude Code 插件，生成个性化知识管理 prompt |
| **Cognisync** | @shrijacked | Filesystem-first 框架，用于 LLM 维护的知识库 |
| **Research Library** | @PeytonAGI | 由 LLM 构建的开源库，处理仓库和研究论文 |
| **claw-brain** | @halluton | 公司级大脑 wiki，存活在 git 仓库中，Claude Code 读写 |
| **Forge** | @AlbertBuchard | 自定义结构化数据库，保持长期连贯意图的记忆系统 |
| **ZettelVault** | @RamXX | 将 Obsidian vault 转换为 PARA + Zettelkasten 结构 |

---

## 总结与核心要点

### Karpathy 方法论精髓

1. **极致简单（Simplicity over complexity）**：flat file system + `AGENTS.md` schema，无复杂插件
2. **人机协作（Human-in-the-loop）**：早期人工引导 LLM 学习模式，随后边际成本持续下降
3. **复利循环（Compounding loop）**：每次查询和探索的输出回写 wiki，知识库越大越有价值
4. **Linting 即质量门控**：定期运行健康检查发现矛盾、缺失和新关联
5. **终极愿景——LLM 团队**：不是单个 LLM，而是一个团队自动完成 wiki 构建 + lint + 报告的全流程

### 社区共识

1. **Linting 被严重低估**——这是从静态知识转储变成活知识系统的关键层
2. **反馈循环创造复利**——传统笔记系统维护成本线性增长，LLM wiki 逆转这一曲线
3. **~400K-700K tokens 是当前规模天花板**——之后需要 RAG 或向量数据库
4. **Markdown 是 LLM 的原生格式**——层次结构语法化，LLM 天然理解
5. **产品机会巨大**——大量开发者已经开始构建相关工具

### 开放问题

1. **Scale ceiling**：何时以及如何优雅地过渡到 RAG？
2. **Silent knowledge drift**：LLM 反复重写 wiki 时如何保证不偏离 source truth？
3. **Temporal metadata**：时间维度如何管理？仅靠文件系统时间戳是否足够？
4. **Cross-domain synthesis**：跨领域连接如何自动化（当前仍是最难的部分）？
5. **Verification gate**：哪些 LLM 写入需要人工验证？信任边界在哪里？

---

## 相关资源

- [ARS Contexta](https://github.com/agenticnotetaking/arscontexta) - Claude Code 知识管理插件
- [Klore](https://github.com/vbarsoum1/klore) - LLM Knowledge Compiler CLI
- [kdb](https://github.com/dremnik/kdb) - Markdown 知识库 CLI
- [Cognisync](https://github.com/shrijacked/Cognisync) - Filesystem-first LLM 知识库框架
- [VAULTMIND](https://github.com/imrajyavardhan12/VAULTMIND) - Obsidian 自动知识注入 CLI
- [PAI Algorithm / LEARN](https://www.albertmiessler.com/pai-algorithm) - Daniel Miessler 的知识收获方法

---

*本文档基于 omp-web-operator 抓取的 437 条评论（帖子总计 778 条回复）整理。保留完整正文翻译和高价值讨论内容。*
