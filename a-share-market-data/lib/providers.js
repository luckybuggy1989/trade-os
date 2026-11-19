const BASE='https://push2his.eastmoney.com/api/qt/stock/kline/get';
const EM='https://push2.eastmoney.com/api/qt';
export const TIMEFRAMES={'1m':1,'5m':5,'15m':15,'30m':30,'60m':60,day:101,week:102,month:103};

export function normalizeInstrument(kind,symbol){
 const s=String(symbol||'').trim().toUpperCase();
 if(kind==='stock'){
  const m=s.match(/^(\d{6})(?:\.(SH|SZ|BJ))?$/);if(!m)throw Error('STOCK_SYMBOL_FORMAT');
  const code=m[1],exchange=m[2]||('659'.includes(code[0])?'SH':'48'.includes(code[0])?'BJ':'SZ');
  if(exchange==='BJ')throw Error('BEIJING_MARKET_NOT_SUPPORTED_BY_THIS_SOURCE');
  return {symbol:`${code}.${exchange}`,secid:`${exchange==='SH'?'1':'0'}.${code}`,code};
 }
 if(kind==='sector'){
  const m=s.match(/^(?:BK(\d{4})|(\d{6}))$/);if(!m)throw Error('SECTOR_SYMBOL_FORMAT_USE_BK_CODE');
  const code=m[1]?`BK${m[1]}`:s;return {symbol:code,secid:`90.${code}`,code};
 }
 throw Error('KIND_MUST_BE_STOCK_OR_SECTOR');
}

function dateOK(d){if(!/^\d{4}-\d{2}-\d{2}$/.test(d))throw Error('INVALID_DATE');const [y,m,day]=d.split('-').map(Number);const x=new Date(Date.UTC(y,m-1,day));if(x.getUTCFullYear()!==y||x.getUTCMonth()!==m-1||x.getUTCDate()!==day)throw Error('INVALID_DATE');}
function ymd(d){return d.replaceAll('-','');}
function num(v){if(v===undefined||v===null||v===''||v==='-')return null;const n=Number(v);return Number.isFinite(n)?n:null;}

export async function getKlines({kind,symbol,timeframe,startDate,endDate,adjustment='none',limit=1200}){
 dateOK(startDate);dateOK(endDate);if(startDate>endDate)throw Error('INVALID_DATE_RANGE');
 const item=normalizeInstrument(kind,symbol),klt=TIMEFRAMES[timeframe];if(!klt)throw Error('UNSUPPORTED_TIMEFRAME');
 const fqt={none:0,qfq:1,hfq:2}[adjustment];if(fqt===undefined)throw Error('INVALID_ADJUSTMENT');
 const p=new URLSearchParams({secid:item.secid,klt:String(klt),fqt:String(fqt),beg:ymd(startDate),end:ymd(endDate),lmt:String(Math.min(1200,Math.max(1,limit))),fields1:'f1,f2,f3,f4,f5,f6,f7,f8',fields2:'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61'});
 const url=`${BASE}?${p}`;const json=await getJson(url);const data=json?.data;if(!data||!Array.isArray(data.klines))throw Error('KLINE_NO_DATA');
 const rows=[];for(const line of data.klines){const c=String(line).split(',');if(c.length<7)continue;const r={day:c[0].slice(0,10),open:num(c[1]),close:num(c[2]),high:num(c[3]),low:num(c[4]),volume:num(c[5]),amount:num(c[6]),amplitude:num(c[7]),pct:num(c[8]),change:num(c[9]),turnover:num(c[10])};
  if(r.day<startDate||r.day>endDate)continue;if(![r.open,r.close,r.high,r.low].every(Number.isFinite)||r.low<=0||r.high<Math.max(r.open,r.close)||r.low>Math.min(r.open,r.close)||r.volume===null||r.volume<0)throw Error('INVALID_KLINE_ROW');rows.push(r);
 }
 return {item,rows:rows.slice(-limit),source:'Eastmoney public quote endpoint (unofficial)',url,provider_status:json.rc??null,timeframe,adjustment};
}

export async function getSectorList({scope='industry',limit=100}){
 const fs=scope==='concept'?'m:90+t:3':'m:90+t:2';
 const fields='f12,f14,f2,f3,f4,f5,f6,f7,f8,f62,f104,f105,f124';
 const params=new URLSearchParams({pn:'1',pz:String(Math.min(500,Math.max(1,limit))),po:'1',np:'1',fltt:'2',invt:'2',fid:'f3',fs,fields});
 const url=`${EM}/clist/get?${params}`;const j=await getJson(url);const dif=j?.data?.diff;if(!Array.isArray(dif))throw Error('SECTOR_LIST_NO_DATA');
 return {source:'Eastmoney public quote endpoint (unofficial)',url,total:j.data.total??dif.length,rows:dif.map(x=>({symbol:String(x.f12||''),name:String(x.f14||''),price:num(x.f2),pct:num(x.f3),change:num(x.f4),volume:num(x.f5),amount:num(x.f6),amplitude:num(x.f7),turnover:num(x.f8),vendor_net_flow:num(x.f62),advance:num(x.f104),decline:num(x.f105),timestamp:x.f124??null}))};
}

export async function getBoardConstituents(symbol){
 const item=normalizeInstrument('sector',symbol);const fields='f12,f14,f2,f3,f5,f6,f8,f20,f21,f62,f124';
 const url=`${EM}/clist/get?${new URLSearchParams({pn:'1',pz:'500',po:'1',np:'1',fltt:'2',invt:'2',fid:'f6',fs:`b:${item.symbol}`,fields})}`;
 const j=await getJson(url);const d=j?.data?.diff;if(!Array.isArray(d))throw Error('BOARD_CONSTITUENTS_NO_DATA');
 return {board:item.symbol,source:'Eastmoney public quote endpoint (unofficial)',url,total:j.data.total??d.length,rows:d.map(x=>({symbol:x.f12,name:x.f14,price:num(x.f2),volume:num(x.f5),amount:num(x.f6),turnover:num(x.f8),total_market_cap:num(x.f20),float_market_cap:num(x.f21),vendor_net_flow:num(x.f62)}))};
}

export async function getStockQuotes(symbols){
 const secids=symbols.map(s=>normalizeInstrument('stock',s).secid);if(!secids.length||secids.length>100)throw Error('QUOTE_SYMBOL_COUNT_1_TO_100');
 const fields='f12,f14,f2,f3,f4,f5,f6,f7,f8,f9,f10,f15,f16,f17,f18,f20,f21,f62,f124';
 const url=`${EM}/ulist.np/get?${new URLSearchParams({fltt:'2',invt:'2',fields,secids:secids.join(',')})}`;const j=await getJson(url);const d=j?.data?.diff;if(!Array.isArray(d))throw Error('STOCK_QUOTES_NO_DATA');
 return {source:'Eastmoney public quote endpoint (unofficial)',url,rows:d.map(x=>({symbol:x.f12,name:x.f14,price:num(x.f2),pct:num(x.f3),change:num(x.f4),volume:num(x.f5),amount:num(x.f6),amplitude:num(x.f7),turnover:num(x.f8),volume_ratio:num(x.f10),high:num(x.f15),low:num(x.f16),open:num(x.f17),previous_close:num(x.f18),total_market_cap:num(x.f20),float_market_cap:num(x.f21),vendor_net_flow:num(x.f62),timestamp:x.f124??null}))};
}

export async function getFlowHistory({kind,symbol,startDate,endDate,limit=120}){
 dateOK(startDate);dateOK(endDate);const item=normalizeInstrument(kind,symbol);
 const url=`https://push2.eastmoney.com/api/qt/stock/fflow/kline/get?${new URLSearchParams({secid:item.secid,klt:'101',lmt:String(Math.min(500,Math.max(1,limit))),beg:ymd(startDate),end:ymd(endDate),fields1:'f1,f2,f3,f7',fields2:'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62'})}`;
 const j=await getJson(url);const kl=j?.data?.klines;if(!Array.isArray(kl))throw Error('FLOW_NO_DATA');const rows=[];
 for(const line of kl){const c=String(line).split(',');if(c.length<3)continue;const day=c[0].slice(0,10);if(day<startDate||day>endDate)continue;rows.push({day,net_inflow:num(c[1]),net_inflow_pct:num(c[2]),large_order_net:num(c[3]),source_measure:'Eastmoney estimated order-size flow'});}
 return {rows,source:'Eastmoney public flow estimate (unofficial; not account-level flow)',url};
}

export async function getBoardQuote(symbol){
 const item=normalizeInstrument('sector',symbol);const url=`${EM}/stock/get?${new URLSearchParams({secid:item.secid,fields:'f43,f44,f45,f46,f47,f48,f57,f58,f60,f62,f124'})}`;const j=await getJson(url);if(!j?.data)throw Error('BOARD_QUOTE_NO_DATA');return {item,data:j.data,url};
}

async function getJson(url){const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; DSHA-Ashare-Market/0.1)','accept':'application/json,text/plain,*/*','referer':'https://quote.eastmoney.com/'},signal:AbortSignal.timeout(18000)});if(!r.ok)throw Error(`HTTP_${r.status}`);const t=await r.text();let j;try{j=JSON.parse(t)}catch{throw Error('SOURCE_RESPONSE_NOT_JSON')};if(j.rc!==undefined&&j.rc!==0)throw Error(`SOURCE_RC_${j.rc}`);return j;}

