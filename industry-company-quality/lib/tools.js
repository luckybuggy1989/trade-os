import { SOURCES, FRAMEWORK } from './sources.js';
import { analyzeFinancials } from './calculations.js';

const D={type:'string',pattern:'^\\d{4}-\\d{2}-\\d{2}$'};
const O=(properties={},required=[])=>({type:'object',properties,required,additionalProperties:false});
const FIN=O({period:{type:'string',pattern:'^\\d{4}(-Q[1-4])?$'},revenue:{type:'number'},grossProfit:{type:'number'},operatingProfit:{type:'number'},netProfit:{type:'number'},operatingCashFlow:{type:'number'},capex:{type:'number'},totalDebt:{type:'number'},totalAssets:{type:'number'},equity:{type:'number'},priorEquity:{type:'number'},rdExpense:{type:'number'},accountsReceivable:{type:'number'},inventory:{type:'number'}},['period']);

export const TOOLS=[
 {name:'industry_source_catalog',description:'查看行业和公司研究可用的一手官方来源及数据口径限制。',inputSchema:O()},
 {name:'industry_chain_report',description:'按行业名称生成产业链/供需周期/机会轮动研究上下文，读取本地证据与链路图，支持summary和detailed两种模式。',inputSchema:O({industry:{type:'string',minLength:1,maxLength:120},asOf:D,since:D,mode:{type:'string',enum:['summary','detailed']}},['industry'])},
 {name:'industry_chain_map_save',description:'保存行业上下游节点和节点间关系的证据链图；每条关键关系需有来源URL。',inputSchema:O({industry:{type:'string',minLength:1,maxLength:120},asOf:D,nodes:{type:'array',minItems:2,maxItems:100,items:O({name:{type:'string',maxLength:120},stage:{type:'string',enum:['upstream','midstream','downstream','enabler','substitute']},products:{type:'array',items:{type:'string',maxLength:120},maxItems:20},description:{type:'string',maxLength:1200},bottleneck:{type:'string',maxLength:600},priceDriver:{type:'string',maxLength:600},evidenceUrls:{type:'array',items:{type:'string',maxLength:500},maxItems:10}},['name','stage','description'])},links:{type:'array',maxItems:200,items:O({from:{type:'string',maxLength:120},to:{type:'string',maxLength:120},relationship:{type:'string',maxLength:400},criticality:{type:'string',enum:['high','medium','low','unknown']},evidenceUrl:{type:'string',maxLength:500}},['from','to','relationship','evidenceUrl'])},sourceUrls:{type:'array',minItems:1,maxItems:100,items:{type:'string',maxLength:500}}},['industry','asOf','nodes','links','sourceUrls'])},
 {name:'industry_evidence_save',description:'保存行业/公司经营、政策、订单、市场份额、产能、价格、专利或竞争反证；记录时间、期间、来源等级、原文链接和限制。',inputSchema:O({industry:{type:'string',minLength:1,maxLength:120},company:{type:'string',maxLength:120},category:{type:'string',enum:['industry_demand','industry_supply','price_cost','capacity_inventory','policy','trade_customs','company_financial','company_order','market_share','customer_supplier','technology_patent','pricing_power','governance','risk_counterevidence','management_statement','other']},title:{type:'string',minLength:1,maxLength:240},fact:{type:'string',minLength:1,maxLength:3000},period:{type:'string',maxLength:80},publishedAt:D,sourceGrade:{type:'string',enum:['audited_filing','exchange_or_regulator','official_statistics','company_statement','industry_association','licensed_provider','media_secondary','user_supplied']},sourceUrl:{type:'string',maxLength:500},limitations:{type:'string',maxLength:1000}},['industry','category','title','fact','publishedAt','sourceGrade','sourceUrl'])},
 {name:'industry_evidence_search',description:'按行业、公司、证据日期查询本地SQLite中已保存的原始研究事实。',inputSchema:O({industry:{type:'string',minLength:1,maxLength:120},company:{type:'string',maxLength:120},since:D,limit:{type:'integer',minimum:1,maximum:500}},['industry'])},
 {name:'company_quality_report',description:'按个股生成链路环节与公司质地研究上下文；可输入多期财务指标作确定性比率计算，或读取已保存财务与来源证据。支持summary/detailed两种模式。',inputSchema:O({industry:{type:'string',minLength:1,maxLength:120},company:{type:'string',minLength:1,maxLength:120},code:{type:'string',pattern:'^\\d{6}(\\.(SH|SZ))?$'},asOf:D,mode:{type:'string',enum:['summary','detailed']},financials:{type:'array',minItems:1,maxItems:12,items:FIN},financialSourceUrl:{type:'string',maxLength:500}},['industry','company'])},
 {name:'industry_company_status',description:'查看本机已保存的行业证据和公司财务记录覆盖情况。',inputSchema:O()}
];

export async function callTool(store,name,a={}){
 if(name==='industry_source_catalog')return {status:'OK',sources:SOURCES,collection_note:'插件不假设这些网站提供统一且稳定的免授权API。用官方页面/公告核对研究证据，再通过industry_evidence_save保留结论依据。'};
 if(name==='industry_chain_map_save'){
  const urls=[...a.sourceUrls,...a.nodes.flatMap(n=>n.evidenceUrls||[]),...a.links.map(x=>x.evidenceUrl)];if(urls.some(x=>!x.startsWith('https://')))throw Error('SOURCE_URL_MUST_BE_HTTPS');
  const nodeNames=new Set(a.nodes.map(n=>n.name));if(a.links.some(l=>!nodeNames.has(l.from)||!nodeNames.has(l.to)))throw Error('LINK_ENDPOINT_MISSING_FROM_NODES');
  return {status:store.saveMap(a.industry,a.asOf,{nodes:a.nodes,links:a.links},[...new Set(urls)])?'SAVED':'DUPLICATE'};
 }
 if(name==='industry_evidence_save'){
  if(!a.sourceUrl.startsWith('https://'))throw Error('SOURCE_URL_MUST_BE_HTTPS');return {status:store.addEvidence(a)?'SAVED':'DUPLICATE'};
 }
 if(name==='industry_evidence_search'){
  const since=a.since||'1970-01-01';const rows=store.evidence(a.industry,a.company||'',since,a.limit||100);return {status:rows.length?'OK':'NO_LOCAL_EVIDENCE',industry:a.industry,company:a.company||null,count:rows.length,evidence:rows,warning:'本地无记录不代表行业或公司没有相关事件。'};
 }
 if(name==='industry_chain_report')return chainReport(store,a);
 if(name==='company_quality_report')return companyReport(store,a);
 if(name==='industry_company_status')return status(store);
 throw Error('UNKNOWN_TOOL');
}

function chainReport(store,a){const mode=a.mode||'summary';if(!['summary','detailed'].includes(mode))throw Error('INVALID_MODE');const day=a.asOf||today();const since=a.since||`${Number(day.slice(0,4))-5}-01-01`;const evidence=store.evidence(a.industry,'',since,300);const map=store.map(a.industry,day);const counts={};for(const e of evidence)counts[e.category]=(counts[e.category]||0)+1;const gaps=['行业规模与口径','需求、产量/出货与渗透率','产能、利用率、库存与新增供给','产业链成本/价格与利润分配','主要节点替代、认证与瓶颈','周期判断的独立交叉指标','政策执行/项目/订单兑现数据','机会轮动触发条件和反证'].filter(x=>!evidence.length||!coveredCategory(x,counts));
 const base={status:evidence.length?'EVIDENCE_AVAILABLE':'INSUFFICIENT_EVIDENCE',mode,industry:a.industry,as_of:day,evidence_since:since,evidence_count:evidence.length,evidence_category_counts:counts,chain_map:map?{as_of:map.as_of,nodes:map.payload.nodes.length,links:map.payload.links.length,source_urls:map.source_urls}:null,coverage_gaps:gaps,source_catalog:SOURCES,framework_summary:FRAMEWORK.industry};
 if(mode==='summary')return {...base,latest_evidence:evidence.slice(0,12).map(compactEvidence),interpretation:'这是研究上下文和证据覆盖清单，不是自动确认的行业结论。请结合来源填充上下游、周期与轮动判断。'};
 return {...base,chain_map_detail:map,evidence,analysis_template:{industry_boundary:{products:[],region:null,classification_basis:null,substitutes:[]},chain_nodes:map?.payload.nodes||[],value_capture_questions:['关键成本/利润池在哪个环节？','价格由谁制定，谁承担库存和账期？','当前瓶颈是否能被扩产/替代解除？'],cycle:{stage_hypothesis:'UNKNOWN',confirming_indicators:[],contradictory_indicators:[]},rotation_points:[{trigger:null,lead_lag:null,affected_nodes:[],company_validation:[],invalidation:null}],scenarios:{base:{},bull:{},bear:{}}},framework:FRAMEWORK.industry,warning:'周期与轮动点需要按具体产业数据填充；缺少实时数据时不能假装当下已有结论。'};
}

function companyReport(store,a){const mode=a.mode||'summary';if(!['summary','detailed'].includes(mode))throw Error('INVALID_MODE');const day=a.asOf||today();let finRows=a.financials||null;let finSource=a.financialSourceUrl||'';
 if(finRows){if(!finSource.startsWith('https://'))throw Error('FINANCIAL_SOURCE_URL_MUST_BE_HTTPS');store.saveFinancials(a.company,a.code||'',day,finRows,finSource);}else{const prior=store.latestFinancials(a.company,a.code||'',day);if(prior){finRows=prior.payload;finSource=prior.source_url;}}
 const metrics=finRows?analyzeFinancials(a.company,a.code||'',finRows):null;const evidence=store.evidence(a.industry,a.company,'1970-01-01',200);const categories={};for(const e of evidence)categories[e.category]=(categories[e.category]||0)+1;const missing=[];if(!metrics)missing.push('至少3期经核对财务数据');for(const c of ['market_share','customer_supplier','company_order','pricing_power','technology_patent','governance'])if(!categories[c])missing.push(c);
 const base={status:metrics||evidence.length?'EVIDENCE_AVAILABLE':'INSUFFICIENT_EVIDENCE',mode,industry:a.industry,company:a.company,code:a.code||null,as_of:day,financial_metrics:metrics?metrics.metrics.at(-1):null,periods:metrics?.periods||[],evidence_count:evidence.length,evidence_category_counts:categories,missing_evidence:missing,source_url_financials:finSource||null};
 if(mode==='summary')return {...base,revenue_cagr:metrics?.revenue_cagr??null,profit_cagr:metrics?.profit_cagr??null,latest_evidence:evidence.slice(0,10).map(compactEvidence),conclusion:'请由研究助手结合详细证据判断公司所处产业链环节、经营质量和话语权。插件不计算未经校准的单一质地分数。'};
 return {...base,financial_analysis:metrics,chain_map:store.map(a.industry,day),evidence,company_framework:FRAMEWORK.company,authority_evidence_checklist:['定价/提价及合同机制','成本转嫁与原材料敏感度','毛利率跨周期表现','产品替代供应商、验证与切换周期','客户/供应商集中度及账期变化','关键工艺、良率、性能与专利法律状态','市场份额分子/分母/产品/地域/期间','订单从框架、定点到交付和收入确认的状态'],warning:'市场份额、技术优势、客户粘性和议价权需逐项证据支持；公司自述、专利数量或客户名单均不足以单独证明。'};
}

function status(store){const evidence=store.db.prepare('SELECT industry,company,category,COUNT(*) count,MAX(published_at) latest FROM evidence GROUP BY industry,company,category ORDER BY industry,company,category').all();const maps=store.db.prepare('SELECT industry,MAX(as_of) latest,count(*) versions FROM chain_maps GROUP BY industry ORDER BY industry').all();const companies=store.db.prepare('SELECT company,code,MAX(as_of) latest,count(*) periods FROM company_financials GROUP BY company,code ORDER BY company').all();return {status:'OK',storage:'SQLite on device',evidence,maps,companies,sources:SOURCES};}
function compactEvidence(e){return {category:e.category,title:e.title,period:e.period,published_at:e.published_at,source_grade:e.source_grade,source_url:e.source_url,claim:e.fact.slice(0,240)};}
function coveredCategory(g,c){const map={'行业规模与口径':['industry_demand'],'需求、产量/出货与渗透率':['industry_demand'],'产能、利用率、库存与新增供给':['industry_supply','capacity_inventory'],'产业链成本/价格与利润分配':['price_cost'],'主要节点替代、认证与瓶颈':['technology_patent'],'周期判断的独立交叉指标':['industry_demand','industry_supply','price_cost'],'政策执行/项目/订单兑现数据':['policy','company_order'],'机会轮动触发条件和反证':['risk_counterevidence']};return map[g]?.some(k=>c[k])||false;}
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai'}).format(new Date());

