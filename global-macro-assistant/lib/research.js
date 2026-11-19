export const INDICATORS=['us2y','us10y','us_real10y','us_2s10s','vix','usdcny_h10','us_cpi_yoy','us_core_pce_yoy','us_unemployment','us_payrolls','us_gdp_real_qoq','ism_manufacturing_pmi','fed_funds_target','ecb_deposit_rate','boj_policy_rate','brent_crude'];
export const SOURCES={
 treasury:{name:'U.S. Department of the Treasury',url:'https://home.treasury.gov/treasury-daily-interest-rate-xml-feed',access:'公开XML，可免key直接请求；日度名义/实际收益率。'},
 cboe:{name:'Cboe Global Markets',url:'https://www.cboe.com/tradable-products/vix/vix-historical-data',access:'官网公开历史数据；插件使用Cboe CSV路径，网络可达性需手机实测。'},
 fed_h10:{name:'Federal Reserve H.10',url:'https://www.federalreserve.gov/releases/h10/current/',access:'官方公开HTML/DDP下载；周度更新，含人民币日观察值，非实时汇价。'},
 fred:{name:'Federal Reserve Bank of St. Louis FRED',url:'https://fred.stlouisfed.org/docs/api/fred/',access:'官方API；所有请求需要用户自行申请API key。插件不内置共享key。'},
 bls:{name:'U.S. Bureau of Labor Statistics',url:'https://www.bls.gov/developers/',access:'官方API公开；BLS v2 key用于更高限额/特定访问，月度CPI、就业数据。'},
 bea:{name:'U.S. Bureau of Economic Analysis',url:'https://apps.bea.gov/api/signup/',access:'官方API，需申请key；GDP与PCE等。'},
 ecb:{name:'European Central Bank Data Portal',url:'https://data.ecb.europa.eu/help/api/overview',access:'SDMX REST公开统计数据；欧元区利率、汇率/金融统计。'},
 ism:{name:'Institute for Supply Management',url:'https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/',access:'官网发布摘要/报告；内容使用与再分发有限制，需谨慎使用，不自动抓全文。'},
 eia:{name:'U.S. Energy Information Administration',url:'https://www.eia.gov/opendata/',access:'官方API需申请免费key；美国能源价格/库存，全球布伦特可用性需再核指标。'}
};
export const DEFINITIONS={
 us2y:'美国2年期国债名义收益率，短中期利率预期的重要市场代理。单位%。受政策利率预期和短期风险偏好共同影响。',
 us10y:'美国10年期国债名义收益率，反映长期无风险利率、通胀预期、实际利率与期限溢价的综合。单位%。',
 us_real10y:'美国10年期TIPS实际收益率曲线。它是官方实际收益率序列，不是用名义收益率减去当期CPI算出的值。单位%。',
 us_2s10s:'美国10年期名义收益率减2年期名义收益率。正值为10年高于2年，负值为曲线倒挂。单位百分点。',
 vix:'Cboe VIX现货指数，从SPX期权价格推导的约30日隐含波动指标，不是股票资金流或确定的下跌概率。指数点。',
 usdcny_h10:'美联储H.10人民币/美元参考汇率，人民币元/美元。按周发布的日度观测，不等同当日中国在岸CNY、离岸CNH或中间价。',
 us_cpi_yoy:'美国消费者价格指数同比变化；月频。判断通胀趋势还需区分总项、核心项和环比。',
 us_core_pce_yoy:'美国核心PCE价格指数同比变化；月频，剔除食品和能源。需注意年度/环比年化口径不能混用。',
 us_unemployment:'美国失业率；月频，U-3统计口径不覆盖所有就业不足。',
 us_payrolls:'美国非农就业人数变化；月频，初值可能修订，单位须按导入数据标明。',
 us_gdp_real_qoq:'美国实际GDP季度变化；必须标明初值/修订值和年化/未年化口径。',
 ism_manufacturing_pmi:'ISM美国制造业PMI扩散指数；50为荣枯分界参考，不是制造业产出增长率。摘要发布不代表可自由再分发全部内容。',
 fed_funds_target:'美联储联邦基金目标利率区间或目标中点；政策决定日频事件，不等同有效联邦基金利率。',
 ecb_deposit_rate:'欧洲央行存款便利利率，政策利率之一；以决议生效日期记录。',
 boj_policy_rate:'日本央行政策利率/短期利率目标；定义需随制度框架变化标注。',
 brent_crude:'布伦特原油基准价格；明确现货/期货、币种、期限与来源后才能比较。'};
export const TRANSMISSION={
 us2y:'若2年期收益率因市场提高对美联储未来政策利率的预期而持续上升，美元资产短端回报可能上升并影响全球风险偏好；需结合联邦基金期货/美联储沟通验证。',
 us10y:'若10年期名义收益率上行，全球长期折现率可能承压；需要区分真实利率与通胀补偿/期限溢价，不能只看总收益率。',
 us_real10y:'若实际利率持续上行，长期现金流资产估值可能承压；A股传导受人民币、国内利率和行业盈利影响，需看实际价格响应。',
 us_2s10s:'曲线倒挂/变陡可能反映政策预期、期限溢价或增长判断变化，单独不能确定衰退时点或A股方向。',
 vix:'VIX抬升表示SPX期权隐含波动提高，全球风险偏好可能转弱；需结合股指实际下跌、信用利差和资金行为确认。',
 usdcny_h10:'人民币兑美元走弱可能反映美元与境内外供求变化；H.10数据较滞后，仅看作结构背景，实时传导须看CFETS中间价和在岸/离岸报价。',
 us_cpi_yoy:'通胀影响市场对政策利率路径的预期；要对照核心通胀、环比和工资数据。',
 us_core_pce_yoy:'核心PCE变化可能改变市场利率预期；只有政策反应和实际利率确认后，才谈估值渠道。',
 us_unemployment:'就业降温可能影响增长预期及宽松预期，二者对风险资产方向可能相反。',
 us_payrolls:'就业新增变化可能影响增长与美联储政策预期；注意基准修订和季节性。',
 us_gdp_real_qoq:'经济增速变化影响盈利预期，但强增长也可能推高利率；拆分消费、投资、库存和净出口。',
 ism_manufacturing_pmi:'PMI订单/生产分项可提示工业周期方向，全球供应链企业可能受影响；需结合实际产出、订单和企业财报。',
 fed_funds_target:'美联储利率决定通过美元融资成本、资本流动预期和全球折现率影响外部金融条件；A股受国内政策与汇率缓冲。',
 ecb_deposit_rate:'欧央行政策变化可能影响欧元和全球利率结构；对A股需有贸易/盈利或风险偏好传导证据。',
 boj_policy_rate:'日本政策利率和日元融资条件变化可能影响套息交易与全球波动；不能由单次加息推断资金必然回流。',
 brent_crude:'油价影响通胀、运输和化工成本，并改变行业利润分配；需区分供给冲击与需求改善。'};
const dir=values=>{if(values.length===2)return values[1]>values[0]?'UP':values[1]<values[0]?'DOWN':'FLAT';if(values.length<3)return 'INSUFFICIENT';let u=0,d=0;for(let i=1;i<values.length;i++){u+=values[i]>values[i-1]?1:0;d+=values[i]<values[i-1]?1:0}const n=values.length-1;if(u>=Math.ceil(n*.7))return 'UP';if(d>=Math.ceil(n*.7))return 'DOWN';return 'MIXED'};
export function trend(input){const byDay=new Map();for(const r of input){const day=r.observed_period||r.observedPeriod;if(!day)continue;const old=byDay.get(day);if(!old||String(r.collected_at||'')>=String(old.collected_at||''))byDay.set(day,r)}const rows=[...byDay.values()].sort((a,b)=>(a.observed_period||a.observedPeriod).localeCompare(b.observed_period||b.observedPeriod));if(!rows.length)throw Error('NO_OBSERVATIONS');const last=rows.at(-1),dayOf=r=>r.observed_period||r.observedPeriod,changes={};for(const n of [1,5,20]){const window=rows.slice(-(n+1));const comparable=window.length===n+1&&new Set(window.map(x=>`${x.unit}|${x.frequency}|${x.source}|${x.source_url||x.sourceUrl}`)).size===1;changes[n]=comparable?{value:last.value-window[0].value,unit:last.unit,from:dayOf(window[0]),to:dayOf(last)}:null}const ds=[1,5,20].map(n=>rows.length>n&&changes[n]?dir(rows.slice(-(n+1)).map(x=>x.value)):'INSUFFICIENT');const short=dir(rows.slice(-6).map(x=>x.value));const prev=dir(rows.slice(-9,-3).map(x=>x.value));return {latest:{...last},sample_count:rows.length,changes,direction_1:ds[0],direction_5:ds[1],direction_20:ds[2],short_medium_divergence:ds[0]!=='INSUFFICIENT'&&ds[1]!=='INSUFFICIENT'&&ds[0]!==ds[1],possible_turning_point:rows.length>=8&&prev!=='INSUFFICIENT'&&short!=='INSUFFICIENT'&&prev!==short&&short!=='MIXED',warning:'变化按该指标有效观测计算；只有来源、单位、频率相同的窗口才计算；不等同A股交易日。'};}
