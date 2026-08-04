---
name: html-interactive-report
description: Generate a self-contained interactive HTML file as a modern replacement for traditional Word/Excel/PDF/TXT deliverables — data reports, financial/statistical tables, formal documents, slide-style presentations, or checklists/manuals. Use this skill whenever the user asks for a report, dashboard, spreadsheet-style output, formal document, or presentation and wants an HTML/interactive/web-page format instead of a static file, or explicitly says things like "做成网页" "做成HTML" "交互式报告" "可以点的报表" "turn this into an interactive HTML page/report/dashboard". Also trigger when the deliverable clearly benefits from sorting/filtering/navigation/collapsible sections even if the user didn't say "HTML" explicitly but asked for a report/table as a webpage.
---

# HTML 交互式报告生成

将原本会用 Word / Excel / PDF / TXT 交付的内容，改为一个独立的、可交互的 HTML 文件。

核心原则：**按内容实际需要选择交互，不做装饰性堆砌**。报表需要排序筛选，操作手册反而应该越简单越好；
不要把所有场景的功能都塞进一份输出。

## 第一步：判断场景

先判断内容属于哪一类（可能是单一场景，也可能是混合），再套用对应模块：

| 场景 | 原本对应格式 | 典型内容 |
|---|---|---|
| A. 数据报表类 | Excel | 财务报表、销售数据、多维度统计汇总 |
| B. 正式文档类 | Word | 项目报告、研究报告、制度文件、合同 |
| C. 演示汇报类 | PPT | 项目汇报、方案展示、路演材料 |
| D. 说明/清单类 | TXT、简单PDF | 操作手册、FAQ、清单 |
| E. 混合分析类 | — | 行业分析、经营分析、尽调报告（叙述+数据+图表并存）|

不确定时，直接问用户内容的性质，或者根据用户提供的原始数据/文字自行判断——不要凭空编造数据。

## 第二步：应用通用基础要求（所有场景都要满足）

**技术约束**
- 单个 HTML 文件，内联所有 CSS/JS，不依赖本地资源；如需图表库（Chart.js / ECharts 等），通过 CDN 引入，
  并确保这是唯一的外部依赖
- 断网情况下核心内容仍可正常显示（图表库加载失败时优雅降级为静态表格，不要空白或报错）
- 响应式布局，手机端内容不能被裁掉或溢出
- 提供 `@media print` 样式，确保"打印/另存为PDF"时版式整洁：隐藏交互控件、避免内容卡在分页处

**设计要求**（参考 frontend-design 技能中的排版与配色原则）
- 根据内容性质（财务/技术/汇报/说明）选择匹配的视觉语言，不要套用通用模板配色
- 排版层级清晰：标题、正文、数据、注释要有明确的视觉区分
- 全篇一套配色和字体系统，克制使用强调色（1个主色即可）

**交互原则**
- 只添加内容实际用得上的交互；表格行数少于20行不需要搜索/分页，超过50行再考虑
- 所有交互功能要有无 JS 兜底（内容本身可读，JS 只是增强体验）

## 第三步：叠加场景专属要求

### A. 数据报表类
- 核心数据用表格呈现，表头固定（滚动时不消失）
- 数值列右对齐、千分位分隔，明确标注单位和口径
- 提供列排序（点击表头）；分类明显的数据提供筛选下拉
- 图表用于辅助表达趋势，不替代原始数据表——图表讲"意义"，表格讲"事实"，两者都要有
- 汇总/小计行视觉上区别于明细行（加粗+浅色背景）
- 可提供"导出当前视图为CSV"（纯前端JS生成）
- 数据来源、口径、截止日期标注在页面显眼位置

### B. 正式文档类
- 左侧或顶部提供目录导航，锚点跳转到对应章节
- 章节编号、字号层级体现正式文档结构（对应Word的标题1/2/3）
- 页面顶部固定"文档信息条"：标题、版本号、日期、状态
- 长段落保持传统阅读密度，不要过度拆成卡片式UI
- 打印样式模拟纸质文档：页边距、页码（CSS counter实现）、图表不跨页断裂
- 保留原有条款/编号体系，不要因改用HTML打乱层级

### C. 演示汇报类
- 内容按"页"组织，每页信息自洽，不依赖滚动理解
- 提供翻页控件（箭头/键盘方向键），同时保留可滚动的"长文档模式"作为兜底
- 每页一个视觉焦点（一句话结论/核心数字/一张图），不堆信息
- 支持"讲义模式"打印（缩略图+旁注），而非逐页全屏打印

### D. 说明/清单类
- 保持极简：不需要图表库，语义化HTML+少量CSS即可
- 步骤类内容用有序列表；FAQ用可折叠问答块，默认收起
- 这是最容易被过度设计的场景——如果基础要求里的响应式、打印样式已够用，不要再加交互

### E. 混合分析类
- 结构上"先结论后细节"：开篇摘要卡片呈现核心结论，正文再展开
- 叙述文字与图表/表格交替出现，每个图表前后有文字说明其要回答的问题
- 图表与支撑数据表格就近放置，便于交叉核对
- 组合使用场景A（表格交互）和场景B（导航+打印）的要求

## 第四步：交付前自查

- 断网打开文件，核心内容是否完整可读
- 手机宽度下查看，内容是否溢出或裁切
- 打印预览（Ctrl+P）版式是否整洁，有无内容卡在分页线上
- 配色字体是否只有一套体系
- 每个交互功能是否对应真实需求，而非顺手添加
- 数据来源、口径、时间戳是否标注清楚

## 输出

生成 `.html` 文件保存到 outputs 目录并交付给用户，不要只在对话中展示代码片段。
