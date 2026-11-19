export function intervalStats(rows,{floatShares=null,previousClose=null}={}){
 if(!rows.length)return {status:'UNAVAILABLE',reason:'区间没有K线'};
 const first=rows[0],last=rows.at(-1),vol=rows.reduce((s,r)=>s+(r.volume||0),0),amount=rows.reduce((s,r)=>s+(r.amount||0),0);
 const turnover=rows.map(r=>r.turnover).filter(Number.isFinite);const simple=turnover.length?turnover.reduce((a,b)=>a+b,0):null;
 const effective=turnover.length?1-turnover.reduce((p,t)=>p*(1-t/100),1):null;
 const calcTurn=floatShares&&floatShares>0?vol/floatShares*100:null;
 const base=previousClose??first.open;const rangeHigh=Math.max(...rows.map(r=>r.high)),rangeLow=Math.min(...rows.map(r=>r.low));
 return {status:'OK',start:first.day,end:last.day,bars:rows.length,open:first.open,close:last.close,high:rangeHigh,low:rangeLow,return_pct:base?round((last.close/base-1)*100,3):null,volume_sum:round(vol,2),amount_sum_cny:round(amount,2),average_daily_amount_cny:round(amount/rows.length,2),provider_turnover_sum_pct:simple===null?null:round(simple,4),effective_turnover_replacement_pct:effective===null?null:round(effective*100,4),calculated_turnover_from_user_float_shares_pct:calcTurn===null?null:round(calcTurn*100,4),turnover_rows:turnover.length,turnover_note:calcTurn!==null?'自算=区间成交量/用户提供流通股数；股本变化会影响结果。':simple!==null?'供应商逐K线换手率；简单求和和复合替换率是不同口径。':'未提供可用换手率或流通股数。',volume_unit:'provider-defined; source feed may differ by instrument',amount_unit:'CNY as returned by source',source_adjustment_note:'区间收益使用所选复权K线；成交额/成交量按源字段原样汇总。'};
}

export function volumeContinuity(rows){
 const x=rows.filter(r=>Number.isFinite(r.volume));if(x.length<2)return {status:'INSUFFICIENT',observations:x.length,increasing_day_streak:null,above_prior_5day_average_streak:null};
 let inc=0;for(let i=x.length-1;i>0&&x[i].volume>x[i-1].volume;i--)inc++;
 let above=0;for(let i=x.length-1;i>=5;i--){const avg=x.slice(i-5,i).reduce((s,r)=>s+r.volume,0)/5;if(x[i].volume>avg)above++;else break;}
 return {status:'OK',increasing_day_streak:inc,above_prior_5day_average_streak:above,latest_volume:x.at(-1).volume,previous_volume:x.at(-2).volume,latest_vs_previous_pct:x.at(-2).volume?round((x.at(-1).volume/x.at(-2).volume-1)*100,2):null,definition:'连续交易日成交量严格高于上一交易日；另列连续高于此前5根均量的天数。'};
}

export function flowContinuity(rows){if(!rows.length)return {status:'UNAVAILABLE',positive_day_streak:null,cumulative_net_inflow:null};let n=0;for(let i=rows.length-1;i>=0&&rows[i].net_inflow>0;i--)n++;return {status:'OK',positive_day_streak:n,cumulative_net_inflow:round(rows.reduce((s,r)=>s+(r.net_inflow||0),0),2),latest_net_inflow:rows.at(-1).net_inflow,definition:'供应商按委托/成交规模分类估算的净流入，不是可识别账户的真实资金流水。',source:rows.at(-1).source_measure};}

export function heatRanking(items){
 const metrics=['return5','amount','turnover','breadth','volumeStreak','flowStreak'];
 const weights={return5:20,amount:20,turnover:10,breadth:15,volumeStreak:20,flowStreak:15};
 const ranked=items.map(x=>({...x,rawMetrics:{return5:x.return5,amount:x.amount,turnover:x.turnover,breadth:x.breadth,volumeStreak:x.volumeStreak,flowStreak:x.flowStreak}}));
 const scores=new Map(ranked.map(x=>[x.symbol,{total:0,weight:0,components:{}}]));
 for(const metric of metrics){const valid=ranked.filter(x=>Number.isFinite(x[metric]));valid.sort((a,b)=>a[metric]-b[metric]);for(let i=0;i<valid.length;i++){const pct=valid.length===1?50:i/(valid.length-1)*100;const s=scores.get(valid[i].symbol);s.components[metric]=round(pct,1);s.total+=pct*weights[metric];s.weight+=weights[metric];}}
 return ranked.map(x=>{const s=scores.get(x.symbol);return {...x,heat_score:s.weight?round(s.total/s.weight,1):null,heat_components:s.components,score_scope:'本次请求候选集内的相对百分位加权；非概率、非收益预测',coverage_pct:round(s.weight/100*100,1)};}).sort((a,b)=>(b.heat_score??-1)-(a.heat_score??-1));
}

export function weightedChipAggregate(members,snapshots){
 const valid=members.filter(m=>Number.isFinite(m.weight)&&m.weight>0&&snapshots.has(m.symbol));const totalWeight=valid.reduce((s,m)=>s+m.weight,0);if(!totalWeight)return {status:'UNAVAILABLE',reason:'所选成分没有可用同花顺筹码快照'};
 const bins=new Map();let covered=0,weightedProfit=0,profitWeight=0;
 for(const m of valid){const snap=snapshots.get(m.symbol),payload=typeof snap.payload==='string'?JSON.parse(snap.payload):snap.payload;covered+=m.weight;const arr=payload.bins||[];for(const b of arr){const p=Number(b.price),mass=Number(b.share_pct??b.weight_pct);if(!Number.isFinite(p)||!Number.isFinite(mass)||mass<0)continue;const key=p.toFixed(3);bins.set(key,(bins.get(key)||0)+mass*m.weight/100);}if(Number.isFinite(payload.profit_ratio)){weightedProfit+=payload.profit_ratio*m.weight;profitWeight+=m.weight;}}
 const sum=[...bins.values()].reduce((a,b)=>a+b,0);const out=[...bins.entries()].map(([price,mass])=>({price:Number(price),weight_pct:sum?round(mass/sum*100,5):0})).sort((a,b)=>a.price-b.price);
 return {status:'AGGREGATED_THs_INPUTS',algorithm:'constituent_weighted_aggregation_of_imported_ThS_chip_snapshots',date:valid.map(m=>snapshots.get(m.symbol).day).sort().at(-1),constituents_available:valid.length,constituents_requested:members.length,weight_coverage_pct:round(covered/totalWeight*100,2),profit_ratio_weighted:profitWeight?round(weightedProfit/profitWeight,3):null,bins:out,warning:'这是对同花顺导入个股结果的板块加权汇总，不是同花顺对板块直接运行的筹码算法；需提供互斥或明确权重的板块成分。'};
}

export function sectorTurnoverFromMembers(rows){const valid=rows.filter(r=>Number.isFinite(r.turnover)&&r.turnover>=0&&Number.isFinite(r.float_market_cap)&&r.float_market_cap>0);const denom=valid.reduce((s,r)=>s+r.float_market_cap,0);if(!denom)return {status:'UNAVAILABLE',reason:'板块成分缺少有效个股换手率/流通市值字段'};return {status:'OK',weighted_turnover_pct:round(valid.reduce((s,r)=>s+r.turnover*r.float_market_cap,0)/denom,4),members_used:valid.length,members_returned:rows.length,coverage_pct:round(valid.length/Math.max(1,rows.length)*100,2),method:'按成分股流通市值加权平均行情供应商个股换手率；非交易所官方板块换手指标。'};}

const round=(n,d=3)=>Number(n.toFixed(d));

