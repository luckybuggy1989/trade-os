# 全球宏观分析助手 · DSHA 插件 0.1.0

独立手机端插件，用固定工具采集全球金融条件和宏观指标、在本机 SQLite 保存序列并计算趋势。主要服务于 A 股宏观判断，包含数据事实、频率/发布日期、趋势、条件性传导、竞争解释和教学。没有自动交易接口。

## 关注框架

| 分析通道 | 重要指标 | 作用与观察重点 |
|---|---|---|
| 美元政策与折现率 | 美国2年名义收益率、联邦基金目标区间 | 短端反映政策利率路径预期。观察实际政策决定与市场定价是否背离。 |
| 全球长期融资条件 | 美国10年名义收益率、10年TIPS实际收益率 | 名义收益率需拆为实际利率、通胀补偿和期限溢价；实际利率影响长期资产折现。 |
| 曲线与周期 | 10年减2年美债利差 | 反映不同期限定价差异，不可单独预测衰退日期。 |
| 风险偏好 | VIX | SPX期权隐含波动指标；观察突升与股指、信用风险是否共振。它不是资金净流出。 |
| 美元和人民币压力 | Fed H.10人民币/美元参考汇率、后续可扩展美元指数 | H.10日观察但每周更新，比较结构趋势，不当作实时在岸/离岸汇率。 |
| 通胀和就业 | 美国CPI、核心PCE、失业率、非农就业 | 月度指标，用于解释政策预期；注意初值、修订及不同口径。 |
| 经济周期 | 美国实际GDP、ISM制造业PMI | GDP季度、PMI月度；强增长可能改善盈利也可能推高利率，影响并非单向。 |
| 全球资金与央行 | 美联储、ECB、BOJ政策决定及资产负债表 | 事件日期和执行日期分开记录，观察政策预期如何传入实际市场条件。 |
| 大宗商品 | Brent/WTI油价 | 区分现货/期货合约、期限和单位；用于通胀、成本与行业盈利传导。 |

不要把所有指标加成未经校准的“全球利多/利空分数”。按通道呈现变化及冲突，最后核对人民币、国内流动性、A股广度/价格及行业盈利暴露。

## 数据来源核验

| 来源与数据 | 获取情况 | 插件状态 |
|---|---|---|
| [美国财政部 Daily Treasury XML](https://home.treasury.gov/treasury-daily-interest-rate-xml-feed)：2年、10年名义及10年实际收益率 | 官方公开 XML，支持按年请求，无FRED key | 已写入直接采集器；需在小米网络实测 |
| [Cboe VIX 历史数据](https://www.cboe.com/tradable-products/vix/vix-historical-data)：日收盘 | 官方页面提供历史数据，插件使用其 CSV 文件路径 | 已写入解析器；网络/CDN可达性需实测 |
| [Federal Reserve H.10](https://www.federalreserve.gov/releases/h10/current/)：USD/CNY日观察值 | 官方页面及DDP数据下载公开；每周发布，不是实时报价 | 已写入当前发布页解析器；网页结构需实测，失败会显示缺口 |
| [FRED API](https://fred.stlouisfed.org/docs/api/fred/)：多种美国及国际序列 | 官方API；所有请求需要用户自行申请API key | 未自动采集。插件不内置共享key |
| [BLS API](https://www.bls.gov/developers/)：CPI、就业 | 官方数据API；频率、key和限制依具体版本 | 暂未自动采集 |
| [BEA API](https://apps.bea.gov/api/signup/)：GDP、PCE、收入 | 官方API，需要申请API key | 暂未自动采集 |
| [ECB Data API](https://data.ecb.europa.eu/help/api/overview)：欧元区利率、金融统计 | 官方SDMX REST接口 | 首版未接 |
| [ISM PMI](https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/) | 官方月报发布，但报告内容有使用/再分发限制 | 不抓取或打包报告全文；可导入用户已获准使用的数据 |
| [EIA Open Data](https://www.eia.gov/opendata/)：能源数据 | 官方API需申请免费key；油种/现货与期货定义须具体核验 | 首版未接 |

插件内直接采集器分别请求财政部名义收益率 XML、实际收益率 XML、Cboe VIX CSV、Fed H.10人民币汇率发布页。每个来源独立记录成功/失败。网页公开不保证手机网络可达；解析字段改变时安全失败，不写入假值。

## 固定工具

- `global_status`：查看数据覆盖和来源。
- `global_collect_official(startDate,endDate)`：采集固定官方来源。
- `global_import_observations(rows)`：导入官方低频序列，要求单位、观测期、发布日期、频率和来源URL。
- `global_daily_brief(asOf?)`：输出最新市场状态和A股外部传导观察。
- `global_trend(indicators,observations?)`：1/5/20个有效观测变化、方向一致性和分化。
- `global_explain(indicator,asOf?)`：入门解释、传导、竞争解释和验证方法。
- `global_policy_save` / `global_policy_timeline`：保存并查看经官方来源核验的央行事件。
- `global_snapshot_save` / `global_snapshot_compare`：SQLite历史快照。

手机数据位置：`~/.local/share/dsh-global-macro-assistant/global-macro.sqlite`。插件不把API key写入仓库；首版也没有要求输入key。

## 安装与首轮检查

在 DSHA 插件页从 GitHub 安装 `luckybuggy1989/trade-os` 的 `global-macro-assistant` 子目录，然后启用。先调用 `global_status`，再执行最近一段日期的 `global_collect_official`；逐源检查最新日期、单位和错误。只有实际返回可核对的行才算接通。美国源以美国市场日期存储，不能因时区转换成A股盘中实时数据。

生成趋势时，每个窗口按该指标自身有效观测个数，而不是A股交易日。H.10虽含多天观测，但一次周发布才被手机获知；历史回填不会作为当时可知信息。低频经济和央行政策未自动接通时，先到官方发布源核对后导入。
