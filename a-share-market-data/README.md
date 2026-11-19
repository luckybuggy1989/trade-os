# A股行情与板块热度 · DSHA 插件 0.1.0

为 DSHA 手机工作区提供固定行情工具：个股/行业/概念多周期K线、任意区间统计、换手率、筹码导入与板块汇总、连续放量和供应商估算资金流、样本内热度排名。数据保存在手机本地SQLite，不连接证券账户、不下单。

## 能力与口径

| 能力 | 工具/计算口径 |
|---|---|
| 个股/板块 K线 | `ashare_kline_fetch` 支持1/5/15/30/60分钟、日、周、月；支持不复权/前复权/后复权；源字段和时间范围随结果返回。覆盖由上游返回决定，分钟K线最多1200根/次。 |
| 本机K线查询 | `ashare_kline_read` 只读SQLite缓存，不联网。 |
| 区间统计 | `ashare_interval_statistics` 输出区间OHLC、收益、成交量和成交额合计、日均成交额、逐K换手率简单合计、复合替换率。个股可传入用户核实的流通股数，另算区间成交量/流通股数。 |
| 板块换手率 | `ashare_sector_turnover` 获取板块成分，按个股流通市值加权供应商换手率；当前成分、当前股本，非历史成分时点指标。 |
| 同花顺筹码 | `ashare_chip_import_ths` 导入同花顺桌面/手机导出的价格档位分布；`ashare_chip_distribution` 读取个股结果，或用指定成分和权重汇总板块筹码。插件没有同花顺私有算法实现，也不会把自建模型标成同花顺算法。 |
| 连续放量/流入 | 按日K线输出成交量连续高于前一日、连续高于前5日均量的交易日数；资金流输出供应商估算净流入连续为正天数。 |
| 综合热度排名 | `ashare_heat_rank` 按请求样本内的百分位，透明加权：5日回报20%、成交额20%、换手率10%、上涨广度15%、放量持续性20%、供应商估算资金流持续性15%。缺数据维度会调整有效权重并返回覆盖率。分数不是概率或收益预测。 |

区间成交额是双边成交规模。换手率的逐日简单累加和复合替换率回答不同问题；复合替换率假设股本分母不变。板块成分可重叠，不能把不同板块成交额或换手率简单相加。

## 数据源与可靠性边界

| 来源 | 用途 | 本插件状态 |
|---|---|---|
| [东方财富公开行情页面接口](https://quote.eastmoney.com/) | 个股/行业/概念K线、行情列表、成分报价和供应商资金流字段 | 首版固定直连接口。属于网页公开接口，非正式面向第三方的稳定API；可能限流、改字段或拒绝手机网络请求。响应均标成非官方源。 |
| [同花顺 iFinD API 官方文档入口](https://quantapi.51ifind.cn/gwstatic/static/ds_web/quantapi-web/) | 授权行情和基础数据服务 | 可作为长期稳定数据源候选；需相应账号、接口权限及使用授权。首版没有用户凭据，因此不自动调用。公开说明显示有行情接口，不代表开放了同花顺筹码算法接口。 |
| [上交所历史行情数据产品](https://www.sseinfo.com/services/assortment/market/hqywwd/wdcpsms/) | 授权的上交所历史K线/行情数据 | 面向数据服务，可能收费或受使用许可限制；不是本插件的免费直连源。 |

公开可见的同花顺“移动筹码分布”功能说明了功能形态，但没有发现可公开验证的完整算法/参数接口。因此：

- 个股精确采用同花顺算法的结果，需由同花顺客户端或获得授权的 iFinD 服务产生，再导入插件。
- 插件会保留来源标签、日期、成本统计和价格分档。标签由导入者声明，插件本身不能验证截图/导出文件是否确由同花顺生成。
- 板块没有一个可观测的真实“板块持仓筹码分布”。插件只可按用户指定的成分股和权重汇总已导入的个股模型结果，并报告成分覆盖率。
- 供应商“主力净流入”是按成交/委托规模分类估计的统计字段，不是账户真实资金流。连续为正只表示该供应商模型连续报告为正。

## 工具列表

- `ashare_market_status`：支持的周期、来源、授权和筹码边界。
- `ashare_kline_fetch(kind,symbol,timeframe,startDate,endDate,adjustment?)`：抓取并缓存K线；股票代码如 `600000.SH`，板块代码如 `BK1027`。
- `ashare_kline_read(...)`：读取本机缓存。
- `ashare_interval_statistics(...)`：获取后计算指定区间量价/换手统计。
- `ashare_sector_turnover(symbol)`：对当前板块成分计算市值加权换手率。
- `ashare_chip_import_ths(items,sourceUrl,providerLabel)`：导入同花顺导出的价格分布和可选统计值，权重会归一到100%。
- `ashare_chip_distribution(targetKind,symbol,asOf,members?)`：个股读取；板块要求提供成分股和权重，并统计缺失项。
- `ashare_heat_rank(scope,symbols?,candidateCount?,lookbackDays?,asOf?,mode?)`：对指定股票列表、行业板块或概念板块排名；支持 `summary` 概要和 `detailed` 详细模式，默认概要。板块不传代码时，先从成交额靠前的候选中排名，不代表全市场完整名次。

## 手机安装

在 DSHA 插件页从 GitHub 仓库 `luckybuggy1989/trade-os` 选择 `a-share-market-data` 子目录安装。首轮可按以下顺序调用：

1. `ashare_market_status` 查看数据源边界。
2. `ashare_kline_fetch` 拉一个个股或板块的日线样本，检查日期、单位、复权方式和最后一根K线是否完整。
3. `ashare_interval_statistics` 计算区间量价；需要自算个股换手时提供对应日期口径的流通股数。
4. `ashare_heat_rank(scope="sectors",mode="summary")` 查看候选板块热度；用 `detailed` 检查逐项连续性和数据缺口。
5. 从同花顺导出筹码数据后调用 `ashare_chip_import_ths`，再查个股或板块汇总。

本地数据库：`~/.local/share/dsh-a-share-market-data/a-share-market.sqlite`。首次安装后，实际联网可达性需在小米14 Pro/DSHA上确认；上游失败会返回错误，不会自动写入零值或旧值冒充新行情。

