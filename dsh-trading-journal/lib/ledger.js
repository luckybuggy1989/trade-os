const dateOnly=x=>/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
export function validateFill(x){
 if(!x.executionId||x.executionId.length>120)throw Error('EXECUTION_ID_REQUIRED');
 if(!/^\d{6}\.(SH|SZ)$/.test(x.symbol))throw Error('A_SHARE_SYMBOL_WITH_EXCHANGE_REQUIRED');
 if(!['BUY','SELL'].includes(x.side))throw Error('INVALID_SIDE');
 if(!dateOnly(x.tradeDate)||!Number.isFinite(Date.parse(x.executedAt))||x.executedAt.slice(0,10)!==x.tradeDate)throw Error('INVALID_EXECUTION_TIME');
 if(!Number.isInteger(x.quantity)||x.quantity<=0)throw Error('QUANTITY_MUST_BE_POSITIVE_INTEGER');
 if(x.side==='BUY'&&x.quantity%100!==0)throw Error('A_SHARE_BUY_QUANTITY_MUST_USE_100_SHARE_LOTS');
 if(!Number.isFinite(x.price)||x.price<=0||!Number.isFinite(x.fees||0)||(x.fees||0)<0)throw Error('INVALID_FILL_PRICE_OR_FEES');
 if(x.userConfirmed!==true)throw Error('USER_CONFIRMATION_REQUIRED_FOR_FILL');
 return true;
}

// Replay immutable fills using FIFO. Same-day buys are excluded from sellable lots (A-share T+1).
export function replayFills(fills,{asOf=null}={}){
 const ordered=[...fills].sort((a,b)=>a.trade_date.localeCompare(b.trade_date)||a.executed_at.localeCompare(b.executed_at)||a.id-b.id);
 const lots=new Map(),realized=[];
 for(const f of ordered){const key=f.symbol;let arr=lots.get(key)||[];
  if(f.side==='BUY'){arr.push({symbol:key,name:f.name,quantity:f.quantity,remaining:f.quantity,price:f.price,fees:f.fees,tradeDate:f.trade_date,executionId:f.execution_id});lots.set(key,arr);continue;}
  let left=f.quantity,matchedCost=0,matchedQty=0;
  for(const lot of arr){if(left<=0)break;if(lot.tradeDate>=f.trade_date)continue;const take=Math.min(left,lot.remaining);if(!take)continue;matchedCost+=take*lot.price+lot.fees*(take/lot.quantity);lot.remaining-=take;left-=take;matchedQty+=take;}
  if(left>0)throw Error(`SELL_EXCEEDS_T1_SELLABLE:${key}:${f.trade_date}:${left}`);
  const buyCost=matchedCost;const sellNet=f.quantity*f.price-f.fees;realized.push({symbol:key,tradeDate:f.trade_date,executionId:f.execution_id,quantity:matchedQty,proceeds:sellNet,buyCost,realizedPnl:sellNet-buyCost});
 }
 const positions=[];for(const [symbol,arr]of lots){const active=arr.filter(x=>x.remaining>0),quantity=active.reduce((s,x)=>s+x.remaining,0);if(!quantity)continue;const cost=active.reduce((s,x)=>s+x.remaining*x.price+x.fees*(x.remaining/x.quantity),0);const settlementDate=asOf||ordered.at(-1)?.trade_date;positions.push({symbol,name:active.at(-1)?.name||symbol,quantity,availableQuantity:active.filter(x=>x.tradeDate<settlementDate).reduce((s,x)=>s+x.remaining,0),remainingCost:cost,averageCost:cost/quantity,oldestLotDate:active[0].tradeDate,lots:active.map(x=>({tradeDate:x.tradeDate,remaining:x.remaining,unitCost:(x.quantity*x.price+x.fees)/x.quantity}))});}
 return {positions,realized,realizedTotal:realized.reduce((s,x)=>s+x.realizedPnl,0)};
}
