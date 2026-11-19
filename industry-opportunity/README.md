# 行业板块机会助手 · DSHA 插件 0.1.0

用于持续整理行业政策、重要人物公开表态、产业新闻、公司披露、美股相关资产表现和A股行业反应。插件输出的是带来源的研究线索，不执行交易，也不把新闻或美股上涨直接等同于A股机会。

## 两种输出模式

- `summary` 概要模式：多插件协作默认使用。每个行业仅返回证据状态、最新事件、美国/中国行情的日期和变化、数据缺口及来源。
- `detailed` 详细模式：单独询问时使用。逐条返回事件标题、日期、发布机构、链接、证据状态、产业映射、美国/中国市场变化、反证问题和限制。

工具 `industry_opportunity_scan` 默认 `summary`。用户单独问某行业时，助手应改用 `industry_opportunity_detail` 或 `mode="detailed"`。

## 分析框架

1. **事件发现**：政策、讲话、行业新闻、公司公告和行业数据分别存储。发布日与事件发生日区分。
2. **证据强度**：正式讲话、政策发布、执行落地、公司订单/经营数据分开标记；页面抓取的标题默认是“未核实”。
3. **产业链映射**：记录美股行业与A股行业的人工映射理由及来源，不将同主题视为直接受益。
4. **海外市场验证**：可导入行业ETF或代表资产日线，计算1/5/20个有效观测回报。海外ETF是代理指标，不代表底层行业盈利。
5. **A股市场验证**：可导入A股行业指数日线；行情缺失时明确输出“未验证”。
6. **反证检查**：执行细则/预算/主体、订单与业绩、成分股广度、估值、竞争和供给约束。

插件不计算未经历史校准的“机会概率”或多空总分。市场行情中的1/5/20代表有效观测，不一定等于自然日或A股交易日。

## 信息来源与接入边界

| 来源 | 可用信息 | 插件实现/限制 |
|---|---|---|
| [工信部新闻发布](https://www.miit.gov.cn/xwfb/) | 部委负责人发布会、政策回应、行业行动 | `industry_refresh_official` 固定抓取列表页标题和链接；网络或页面变更时逐源报错。抓取不等于已核实正文。 |
| [中国政府网政策文件](https://www.gov.cn/zhengce/zuixin/) | 中央政策文件 | 固定列表页抓取标题和链接；正文解读需打开原文核实。 |
| [巨潮资讯信息披露](https://www.cninfo.com.cn/new/commonUrl?url=disclosure%2Flist%2Fnotice) | 上市公司公告 | 固定列表页尝试抓取；其网页/API结构可能改变，自动结果默认未核实。正式公告链接可用 `industry_save_evidence` 手工入库。 |
| [中证指数](https://www.csindex.com.cn/) / [国证指数授权说明](https://www.cnindex.com.cn/zh_services/data_licensing/index.html?act_menu=4&act_service=3) | 行业分类、指数样本/方案、指数数据服务 | 指数行情对外使用可能要求授权，插件不抓取未授权行情。 |
| [SEC EDGAR API](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) | 美国公司官方披露 | 官方API可用于公司公告，不提供美股行业价格序列；首版记录为可靠核验渠道，未集成自动采集。 |
| [NYSE Arca EOD ETF Report](https://www.nyse.com/data-products/catalog/nyse-arca-eod-etf-report) | 美股ETF日终价格/成交数据产品 | 需核对费用、访问方式和使用授权；首版用数据导入接口接入。 |

公开网页可读不代表其提供稳定、免费、可批量调用或可再分发的数据接口。插件不会依赖未经确认的非官方行情接口。行情可以从你有权使用的券商/数据终端导出后导入；每条序列保留来源URL和质量标签。

## 固定工具

- `industry_status`：查看SQLite数据覆盖、来源和局限。
- `industry_refresh_official(sectors,since)`：扫描工信部、中国政府网和巨潮列表页，匹配行业标题并保存链接。当前只保存短标题，不抓取全文；成功结果仍标为未核实。
- `industry_save_evidence(...)`：保存经人工核对的讲话、政策落地、新闻、公告或反证；要求 HTTPS 原始来源。
- `industry_import_market_data(rows)`：导入美股/ A股日线，字段包括市场、行业、证券代码、日期、收盘、可选成交量/基准回报、来源、URL和数据质量。
- `industry_set_mapping(...)`：保存美股到A股行业映射及依据。
- `industry_opportunity_scan(mode,sectors,since)`：批量概要或详细扫描。
- `industry_opportunity_detail(sector,since)`：单个行业证据链与市场验证。
- `industry_snapshot_save(day)` / `industry_snapshot_compare(count)`：保存和比较手机本地SQLite快照。

内置可选行业包括半导体、人工智能、机器人、新能源、医药、消费、周期、金融、传媒、军工等；也可通过证据导入保存自定义行业名称，但要与扫描名称一致才能匹配。

## 小米/DSHA 运行

Node.js 24+ 插件，数据写入手机本机 `~/.local/share/dsh-industry-opportunity-assistant/industry-opportunity.sqlite`。不需要服务端、API key 或交易账户。手机网络对政府站点的访问可能受网络环境影响；每个来源分别显示状态，无法访问时保留缺口，不补造数据。

从 DSHA 插件页安装 GitHub 仓库 `luckybuggy1989/trade-os` 的 `industry-opportunity` 子目录。导入后先调用 `industry_status`；再调用 `industry_refresh_official` 拉取标题；核对原文后使用 `industry_save_evidence`。市场行情需使用 `industry_import_market_data` 导入授权数据，再运行扫描。

## 已知边界

- 当前自动抓取是有限的官方列表页HTML解析，需在小米手机实测可达性与页面兼容性；抓取到的标题不能替代原文核验。
- 新闻采集目前按行业关键词匹配标题，漏报/误报都可能发生；重要人物及政策执行细节应以原始发布会/正式文件为准，并可手工录入。
- 中美行业分类口径不同，映射需要维护理由和来源。
- 首版没有内置可靠的美国和A股板块行情API，需用户提供有权使用的数据。没有行情数据时只能报告证据，不能报告市场趋势。
- 内容用于研究辅助，不构成投资建议。

