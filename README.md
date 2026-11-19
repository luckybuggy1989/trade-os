# 国内宏观分析助手 · DSHA 插件 v0.1.0

为 A 股交易助手提供固定的国内宏观接口：公开数据采集、当天资金/政策摘要、1/5/20期趋势、指标解释、SQLite快照和快照比较。不自动交易。插件面向宏观初学者：回答同时提供事实、口径、趋势、条件性影响、反证和下一步观察。

## 重要架构说明

插件在小米14 Pro侧直接运行采集代码、请求公开源、存储SQLite并计算趋势，不依赖电脑或Trade OS。`macro_refresh`、`macro_daily_brief` 等是固定直达工具；调用不会让模型动态侦测接口。若某数据源不通或接口结构未验证，显示 `UNAVAILABLE`，不会假造数据。

## 工具

- `macro_status`：Bridge、数据覆盖和手机快照状态。
- `macro_collect_official(startDate,endDate)`：显式更新已实现的固定公开源并报告未接指标。
- `macro_import_observations(rows)`：导入带来源、发布日期与口径的官方宏观序列。
- `macro_daily_brief(asOf?)`：国内资金、政策、经济指标及A股条件性传导。
- `macro_trend(indicators,days?)`：同口径有效观测的 1/5/20 期变化和趋势/断点。
- `macro_policy_timeline(startDate,endDate,topics?)`：查看官方政策事件；自动时间线目前标为待接入。
- `macro_explain(indicator,asOf?)`：初学者指标解释。
- `macro_snapshot_save(asOf)` / `macro_snapshot_compare(count)`：SQLite追加历史和趋势比较。

## 分析逻辑

1. **今日资金价格和政策操作**：DR007、Shibor、公开市场操作及官方公告。利率的“水平”和“变化”分开。若没有可靠日度观测，不用月度M2代替今日流动性。
2. **信用与货币**：社融、M1、M2、新增人民币贷款。区分存量与增量、名义金额与同比；它们按月发布，日报只说明最新发布日期和距今时长。
3. **经济与价格**：制造业PMI、CPI/PPI、工业增加值、社零、固定资产投资及房地产。PMI是扩散指数，不是产出增长率。
4. **财政与外需**：财政收支、政府债净融资、进出口；如无统一稳定数据合同，明确缺失。
5. **A股传导验证**：对照 Trade OS 的融资、ETF份额、市场广度、成交及板块表现。融资余额/ETF申赎/成交额各按原口径显示，不合计成全市场“净流入”。
6. **趋势**：逐指标计算最近1/5/20个有效观测变化；方向一致则说明持续，方向不同则说明短长周期分化；只有连续序列实际支持时才标为拐点。
7. **教学结论**：事实→计算→假设→反证→后续观察。宏观政策到企业盈利及股票价格之间存在时滞和中间环节，不把机制写成已证明因果。

## 数据源与边界

官方公开入口：

- 国家统计局国家数据：[data.stats.gov.cn](https://data.stats.gov.cn/)
- 中国人民银行：[pbc.gov.cn](https://www.pbc.gov.cn/)
- 中国货币网回购利率：[chinamoney.com.cn](https://www.chinamoney.com.cn/chinese/bkfrr/)
- 财政部财政数据：[mof.gov.cn](https://www.mof.gov.cn/zhengwuxinxi/caizhengshuju/)
- 国家发展改革委：[ndrc.gov.cn](https://www.ndrc.gov.cn/xwdt/xwfb/)
- 国务院政策文件：[gov.cn](https://www.gov.cn/zhengce/zuixin.htm)

公开网页不是稳定 API 的保证。首版内置 Shibor 结构化候选采集器，但接口结构需在目标网络实测；如不可用会记为 `UNAVAILABLE`。LPR、M1/M2、社融、CPI/PPI、PMI、政府债和政策公告尚未接自动化适配器，可从官方来源核对后用 `macro_import_observations` 导入。插件不会绕过验证码、限流或 TLS 校验，也不默认再分发官方数据。国家统计局说明其通过官网、发布会和国家数据发布库发布数据，月度/季度细项按发布节奏更新；不应把该类序列标成每日指标。[国家统计局说明](https://www.stats.gov.cn/zs/tjws/tjzn/202301/t20230101_1903409.html) Shibor 由全国银行间同业拆借中心授权发布，每个工作日北京时间11时发布。[中国货币网说明](https://www.chinamoney.com.cn/english/bmkshb/)

## 安装和验证

从 GitHub 仓库导入后启用。先调用 `macro_status`，再运行 `macro_collect_official`；检查日期、来源、单位、发布日期和失败说明；对尚未接通的月度数据先通过官方页面核验并用 `macro_import_observations` 导入，再测试趋势、两日快照比较。

宿主：DSHA 0.2.2 / DSH 0.2.2-rc.1；Node.js 24+；手机本地 SQLite。未在小米14 Pro实机通过前不宣称实机验收。仅研究，不含下单接口。
