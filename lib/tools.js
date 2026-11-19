import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { homedir } from 'node:os';

const DATE = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' };
const schema = (properties = {}, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
const INDICATORS = ['dr007','shibor_overnight','shibor_7d','lpr_1y','lpr_5y','m1_yoy','m2_yoy','social_financing_yoy','cpi_yoy','ppi_yoy','pmi_manufacturing','gov_bond_net_financing'];
const SOURCES = {
  pbc: { name: '中国人民银行', url: 'https://www.pbc.gov.cn/' },
  chinamoney: { name: '中国货币网/全国银行间同业拆借中心', url: 'https://www.chinamoney.com.cn/' },
  nbs: { name: '国家统计局国家数据', url: 'https://data.stats.gov.cn/' },
  mof: { name: '财政部', url: 'https://www.mof.gov.cn/zhengwuxinxi/caizhengshuju/' },
  gov: { name: '中国政府网', url: 'https://www.gov.cn/zhengce/zuixin.htm' },
  ndrc: { name: '国家发展改革委', url: 'https://www.ndrc.gov.cn/xwdt/xwfb/' },
  custom: { name: '用户输入并提供来源', url: null }
};

export const TOOLS = [
  { name:'macro_status', description:'查看手机端宏观SQLite数据覆盖、各源最后采集时间和数据缺口。', inputSchema:schema() },
  { name:'macro_collect_official', description:'从国内公开官方源采集可自动获取的结构化日度数据；明确报告失败源与未接指标，不调用大模型探测接口。', inputSchema:schema({startDate:DATE,endDate:DATE},['startDate','endDate']) },
  { name:'macro_import_observations', description:'将用户提供的宏观序列追加到SQLite；必须同时给来源、观察期、发布日、频率、单位和指标值。', inputSchema:schema({rows:{type:'array',maxItems:500,items:{type:'object',properties:{indicator:{type:'string',enum:INDICATORS},value:{type:'number'},unit:{type:'string',maxLength:32},observedPeriod:{type:'string',maxLength:32},releasedAt:DATE,sourceUrl:{type:'string',maxLength:500},frequency:{type:'string',enum:['daily','weekly','monthly','quarterly','event']},quality:{type:'string',enum:['official','user_supplied']}},required:['indicator','value','unit','observedPeriod','releasedAt','sourceUrl','frequency','quality'],additionalProperties:false}}},['rows']) },
  { name:'macro_daily_brief', description:'基于手机SQLite中可用的最新观测，生成当天资金面、政策面和A股传导摘要；不以历史月度指标冒充今日数据。', inputSchema:schema({asOf:DATE}) },
  { name:'macro_trend', description:'计算指定指标最近1/5/20个同口径有效观测变化，识别方向持续性、短长周期背离与样本不足。', inputSchema:schema({indicators:{type:'array',items:{type:'string',enum:INDICATORS},maxItems:12},observations:{type:'integer',minimum:5,maximum:250}},['indicators']) },
  { name:'macro_policy_timeline', description:'按官方来源读取插件采集到的宏观政策事件；当前版本若公告源未结构化接入会明确显示缺口。', inputSchema:schema({startDate:DATE,endDate:DATE,topics:{type:'array',items:{type:'string',enum:['monetary','fiscal','growth','property','capital_market','other']},maxItems:6}},['startDate','endDate']) },
  { name:'macro_explain', description:'针对初学者解释指标含义、最新观测、趋势、对A股的条件性传导、竞争解释及下一步验证。', inputSchema:schema({indicator:{type:'string',enum:INDICATORS},asOf:DATE},['indicator']) },
  { name:'macro_snapshot_save', description:'将当天简报作为不可变手机端SQLite历史快照追加保存。', inputSchema:schema({asOf:DATE},['asOf']) },
  { name:'macro_snapshot_compare', description:'比较最近保存的宏观快照，标明观测、发布日期或口径发生变化的项目。', inputSchema:schema({count:{type:'integer',minimum:2,maximum:90}},['count']) }
];

function iso(value){const d=new Date(value);return Number.isNaN(d.valueOf())?null:d.toISOString().slice(0,10)}
function checkRange(a,b){if(!/^\d{4}-\d{2}-\d{2}$/.test(a)||!/^\d{4}-\d{2}-\d{2}$/.test(b)||a>b)throw Error('INVALID_DATE_RANGE')}
function info(row){return {...row,source:SOURCES[row.source]||SOURCES.custom}}
function linearDirection(values){if(values.length<3)return 'INSUFFICIENT';let up=0,down=0;for(let i=1;i<values.length;i++){if(values[i]>values[i-1])up++;else if(values[i]<values[i-1])down++}if(up>=Math.ceil((values.length-1)*.7))return 'UP';if(down>=Math.ceil((values.length-1)*.7))return 'DOWN';return 'MIXED'}
function calcTrend(rows){rows=[...rows].sort((a,b)=>a.observed_period.localeCompare(b.observed_period));let last=rows.at(-1);const changes={};for(const n of [1,5,20])changes[n]=rows.length>n?{value:last.value-rows.at(-n-1).value,from:rows.at(-n-1).observed_period,to:last.observed_period,unit:last.unit}:null;const tail=rows.slice(-6).map(r=>r.value);const dirs=[1,5,20].map(n=>rows.length>n?linearDirection(rows.slice(-(n+1)).map(r=>r.value)):'INSUFFICIENT');return {latest:info(last),sample_count:rows.length,changes,direction_1:dirs[0],direction_5:dirs[1],direction_20:dirs[2],short_long_divergence:dirs[0]!=='INSUFFICIENT'&&dirs[1]!=='INSUFFICIENT'&&dirs[0]!==dirs[1],possible_turning_point:tail.length>=5&&linearDirection(tail.slice(0,-2))!==linearDirection(tail.slice(-3))&&linearDirection(tail.slice(-3))!=='MIXED',warning:'1/5/20是该指标的有效观测数，不等同A股交易日；相关变化不证明因果。'}}
async function fetchText(url,timeout=15000){const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; DSHA-CN-Macro/0.1)'},signal:AbortSignal.timeout(timeout)});if(!r.ok)throw Error(`HTTP_${r.status}`);return r.text()}
async function collectShibor(store,start,end){
  // CFETS public JSON endpoint, contract verified at runtime (fail closed on unknown schema).
  const url='https://www.chinamoney.com.cn/r/cms/www/chinamoney/data/currency/shibor.json';
  const res=await fetch(url,{headers:{'user-agent':'Mozilla/5.0','accept':'application/json'},signal:AbortSignal.timeout(15000)});
  if(!res.ok)throw Error(`HTTP_${res.status}`);const data=await res.json();
  const blocks=data?.records||data?.data?.records||data?.data?.result;
  if(!Array.isArray(blocks)||!blocks.length)throw Error('UNEXPECTED_SHIBOR_SCHEMA');
  const latest=data.publishDate||data.date||data.data?.publishDate||data.data?.date;
  if(!latest)throw Error('SHIBOR_RELEASE_DATE_MISSING');const day=iso(latest);if(!day)throw Error('SHIBOR_DATE_INVALID');
  let count=0;
  for(const row of blocks){const code=String(row.termCode||row.term||row.name||row.variety||'').toLowerCase();const raw=row.rate??row.value??row.shiborRate;if(raw===undefined)continue;
    const indicator=code.includes('o/n')||code.includes('on')||code.includes('隔夜')?'shibor_overnight':code.includes('1w')||code.includes('7d')||code.includes('一周')?'shibor_7d':null;if(!indicator)continue;
    if(day<start||day>end)continue;store.insertObservation({indicator,value:Number(String(raw).replace('%','')),unit:'%',observedPeriod:day,releasedAt:day,source:'chinamoney',sourceUrl:url,frequency:'daily',quality:'official'});count++;
  }
  if(!count)throw Error('SHIBOR_ROWS_NOT_RECOGNIZED');return {rows:count,observedDate:day,url};
}
async function collectRates(store,start,end){
  const sources=[];
  try{sources.push({source:'chinamoney:shibor',status:'OK',...await collectShibor(store,start,end)})}catch(e){sources.push({source:'chinamoney:shibor',status:'UNAVAILABLE',error:String(e.message).slice(0,100),url:SOURCES.chinamoney.url})}
  // LPR and policy-market operations are public, but no stable confirmed anonymous API is bundled yet.
  sources.push({source:'pbc:lpr',status:'UNAVAILABLE',reason:'官方公开发布；自动化结构化接口尚未验证，需后续适配',url:SOURCES.pbc.url});
  sources.push({source:'pbc:omo',status:'UNAVAILABLE',reason:'公告可公开阅读；固定接口/公告解析器尚未验证',url:SOURCES.pbc.url});
  sources.push({source:'nbs:monthly',status:'UNAVAILABLE',reason:'国家数据公开查询；历史数据接口/字段版本尚未验证',url:SOURCES.nbs.url});
  sources.push({source:'mof:fiscal',status:'UNAVAILABLE',reason:'官方公开；稳定结构化抓取尚未接入',url:SOURCES.mof.url});
  return {status:sources.some(s=>s.status==='OK')?'PARTIAL':'UNAVAILABLE',sources,coverage:'首版仅试采中国货币网Shibor候选接口；其他月度与政策数据明确为待接入。'};
}

export async function callTool(store,name,args){
  if(name==='macro_status')return store.status(SOURCES);
  if(name==='macro_collect_official'){checkRange(args.startDate,args.endDate);const r=await collectRates(store,args.startDate,args.endDate);return {...r,collectionDate:new Date().toISOString(),stored:store.countObservations()}}
  if(name==='macro_import_observations'){let inserted=0,errors=[];for(const r of args.rows){if(!Number.isFinite(r.value))throw Error('INVALID_VALUE');if(!/^https:\/\//.test(r.sourceUrl))throw Error('SOURCE_URL_MUST_BE_HTTPS');try{if(store.insertObservation({...r,source:'custom'}))inserted++}catch(e){errors.push({indicator:r.indicator,error:e.message})}}return {status:errors.length?'PARTIAL':'OK',inserted,errors,source:'user_supplied_with_url'}}
  if(name==='macro_trend'){const days=args.observations||90;return args.indicators.map(id=>{const rows=store.observations(id,days);return {indicator:id,...(rows.length?calcTrend(rows):{status:'UNAVAILABLE',sample_count:0,missing:'尚无本地序列；先运行macro_collect_official或通过macro_import_observations导入官方序列。'})}})}
  if(name==='macro_policy_timeline'){checkRange(args.startDate,args.endDate);return {status:'UNAVAILABLE',events:[],requested:{startDate:args.startDate,endDate:args.endDate},source:SOURCES.pbc,url:SOURCES.pbc.url,missing:'官方政策公告暂未接入稳定结构化采集。不要把搜索摘要或未核对转载当作已验证事件。'}}
  if(name==='macro_daily_brief'){const day=args.asOf||new Date().toISOString().slice(0,10);const indicators=INDICATORS.map(id=>{const rows=store.observations(id,90);return rows.length?{indicator:id,...calcTrend(rows)}:{indicator:id,status:'UNAVAILABLE'}});const available=indicators.filter(x=>x.latest);return {as_of:day,generated_at:new Date().toISOString(),summary:available.length?'国内宏观数据覆盖不完整；结合已取得指标谨慎分析。':'证据不足，当前没有已验证的宏观观测，不能给出当日多空结论。',capital_and_policy:'政策时间线、央行公开市场操作和A股响应尚未完成结构化采集。',indicators,missing:indicators.filter(x=>!x.latest).map(x=>x.indicator),limitations:['未验证来源绝不作为已接入数据。','月度数据按实际观测期与发布日期陈列，不代表当天变化。','宏观指标不能直接推导A股涨跌，须结合市场供求与价格验证。']}}
  if(name==='macro_explain'){const row=store.observations(args.indicator,90);return {indicator:args.indicator,data:row.length?calcTrend(row):null,definition:definitions[args.indicator],transmission:transmission[args.indicator],what_to_verify:['检查数据来源、观测期、发布时间和单位。','对照同一指标的1/5/20个有效观测变化。','核对A股融资、ETF份额、成交广度和价格响应。'],if_missing:'没有序列时只解释定义，不提供当前方向。'}}
  if(name==='macro_snapshot_save'){const result=await callTool(store,'macro_daily_brief',args);store.saveSnapshot(args.asOf,new Date().toISOString(),result);return {status:'SAVED',date:args.asOf,availableIndicators:result.indicators.filter(x=>x.latest).length,missing:result.missing}}
  if(name==='macro_snapshot_compare'){const rows=store.snapshots(args.count);return rows.length<2?{status:'INSUFFICIENT_HISTORY',available:rows.length,required:2}:{status:'OK',snapshots:rows.reverse(),guidance:'按相同指标、来源、观测周期对比；月度指标未发布新一期时是同一观测，不是新日度趋势。'}}
  throw Error('UNKNOWN_TOOL');
}

export const definitions={
  dr007:'存款类机构7天质押式回购利率，银行间短期资金价格指标；不是A股资金净流入。单位%。',
  shibor_overnight:'上海银行间同业拆放利率隔夜期限，反映银行间无担保短期拆借报价。单位%。',
  shibor_7d:'上海银行间同业拆放利率1周期限，反映银行间无担保短期拆借报价。单位%。',
  lpr_1y:'1年期贷款市场报价利率，银行贷款定价参考之一；月度公布。单位%。',
  lpr_5y:'5年期以上贷款市场报价利率，长期贷款定价参考之一；月度公布。单位%。',
  m1_yoy:'狭义货币供应量同比增速；流通中现金与单位活期存款等口径，不等同居民消费意愿。单位%。',
  m2_yoy:'广义货币供应量同比增速；反映货币存量增长，不代表全部资金会进入股票。单位%。',
  social_financing_yoy:'社会融资规模存量或增量需区分具体口径；当前插件导入合同要求由用户标明观测期和数值，不能混用同比、余额和新增额。',
  cpi_yoy:'居民消费价格指数同比变化，衡量居民消费品与服务价格变化，不等于全部企业成本。单位%。',
  ppi_yoy:'工业生产者出厂价格指数同比变化，反映工业品出厂价格变动。单位%。',
  pmi_manufacturing:'制造业采购经理指数扩散指标，50为荣枯分界参考，不是产出增速。单位指数点。',
  gov_bond_net_financing:'政府债净融资需要明确中央/地方债范围、发行与偿还口径；不直接等于A股抽水金额。单位以导入记录为准。'
};
const transmission={dr007:'若DR007持续上行且央行操作未缓解，银行间短期资金成本可能抬升；需观察跨期限利率、回购成交和A股风险偏好。',shibor_overnight:'隔夜利率上升可能反映短期拆借成本上行，但节假日、缴税、月末等因素也会引起波动；需和DR007及央行操作交叉看。',shibor_7d:'一周利率变化可反映跨周资金价格预期；需区分月末/季末扰动和持续融资压力。',lpr_1y:'若贷款定价下降并传导至新增信贷，企业融资成本可能降低；要看贷款需求和信用扩张是否跟上。',lpr_5y:'若长期贷款利率下降，可能降低部分长期融资成本；房地产需求、政策和信用风险仍决定传导效果。',m1_yoy:'M1回升可能与交易性资金活跃相关；需要拆解财政、企业存款等来源，并验证信用与企业活动。',m2_yoy:'M2增长反映货币存量变化；只有信用需求和风险偏好配合时，才可能传导至权益配置。',social_financing_yoy:'社融扩张可能显示实体融资增加；需分清政府债、贷款、企业债等构成及资金用途，不能直接当作股市增量资金。',cpi_yoy:'价格回升可能改善名义收入，也可能改变利率预期；需结合核心CPI、工资和政策反应。',ppi_yoy:'PPI回升可能改善部分上游企业收入，也可能抬高下游成本；行业影响方向并不一致。',pmi_manufacturing:'PMI高于50表示报告改善的企业比例占优；还需结合新订单、生产、库存和实际产量。',gov_bond_net_financing:'政府债融资增加可能支持财政支出，也可能阶段性影响银行流动性；要看缴款、财政支出进度和央行对冲。'};
