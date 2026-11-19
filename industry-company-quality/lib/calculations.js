const num=x=>x===null||x===undefined||x===''?null:Number.isFinite(Number(x))?Number(x):null;
const div=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&b!==0?a/b:null;
const pct=x=>x===null?null:round(x*100,3);
const round=(x,d=3)=>Number(x.toFixed(d));

export function analyzeFinancials(company,code,rows){
 const xs=[...rows].sort((a,b)=>periodIndex(a.period)-periodIndex(b.period));
 const data=xs.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,k==='period'?v:num(v)])));
 const byPeriod=new Map(data.map(r=>[r.period,r]));
 const derived=data.map(r=>{const prior=priorComparablePeriod(r.period),prev=prior?byPeriod.get(prior):null;return {period:r.period,revenue_yoy_pct:prev?pct(div(r.revenue-prev.revenue,prev.revenue)):null,net_profit_yoy_pct:prev?pct(div(r.netProfit-prev.netProfit,prev.netProfit)):null,gross_margin_pct:pct(div(r.grossProfit,r.revenue)),operating_margin_pct:pct(div(r.operatingProfit,r.revenue)),net_margin_pct:pct(div(r.netProfit,r.revenue)),cfo_to_net_profit:div(r.operatingCashFlow,r.netProfit),free_cash_flow:r.operatingCashFlow!==null&&r.capex!==null?r.operatingCashFlow-r.capex:null,free_cash_flow_margin_pct:pct(div(r.operatingCashFlow!==null&&r.capex!==null?r.operatingCashFlow-r.capex:null,r.revenue)),debt_to_assets_pct:pct(div(r.totalDebt,r.totalAssets)),roe_pct:pct(div(r.netProfit,(r.equity!==null&&r.priorEquity!==null?(r.equity+r.priorEquity)/2:r.equity))),rd_to_revenue_pct:pct(div(r.rdExpense,r.revenue)),receivables_to_revenue_pct:pct(div(r.accountsReceivable,r.revenue)),inventory_to_revenue_pct:pct(div(r.inventory,r.revenue)),capex_to_revenue_pct:pct(div(r.capex,r.revenue))};});
 const first=data[0],last=data.at(-1),years=first&&last?periodIndex(last.period)-periodIndex(first.period):null;
 return {company,code,periods:data.map(x=>x.period),latest_period:last?.period??null,metrics:derived,revenue_cagr:years&&years>0&&first.revenue>0&&last.revenue>0?round((Math.pow(last.revenue/first.revenue,1/years)-1)*100,3):null,profit_cagr:years&&years>0&&first.netProfit>0&&last.netProfit>0?round((Math.pow(last.netProfit/first.netProfit,1/years)-1)*100,3):null,interpretation_limits:['利润为负或基期非正时不计算CAGR；同比在基期接近0/为负时容易失真。','ROE使用期末权益；如提供priorEquity则使用期初期末平均值。未提供平均资本/投入资本时不冒充ROIC。','经营现金流/净利润在净利润为0或负时只列比率，不自动判断现金质量。','应收/收入和存货/收入是期末余额粗略比例，不等于周转天数；精算需平均余额与季度/日数据。','capex的报表口径需确认：购建固定无形长期资产现金支出可能不等于资本化投入。','未做同行口径校准，不输出单一公司质地分数。']};
}
function periodIndex(p){const m=String(p).match(/^(\d{4})(?:-Q([1-4]))?$/);if(!m)throw Error('INVALID_FINANCIAL_PERIOD');return Number(m[1])+(m[2]?Number(m[2])/4:1);}
function priorComparablePeriod(p){const m=String(p).match(/^(\d{4})(-Q[1-4])?$/);return m?`${Number(m[1])-1}${m[2]||''}`:null;}

