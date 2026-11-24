const DEFAULT_RATIOS=[0.382,0.5,0.618,1,1.618];
const round=(n,d=6)=>Number(n.toFixed(d));

export function validateBars(bars){
 if(!Array.isArray(bars)||bars.length<5)throw Error('BARS_REQUIRE_AT_LEAST_5_ROWS');
 let prior='';
 for(const b of bars){
  if(!/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(b.time)||!Number.isFinite(Date.parse(b.time)))throw Error('INVALID_BAR_TIME');
  if(b.time<=prior)throw Error('BARS_MUST_BE_STRICTLY_ORDERED');prior=b.time;
  if(![b.open,b.high,b.low,b.close].every(Number.isFinite)||b.low<=0||b.high<b.low||b.high<Math.max(b.open,b.close)||b.low>Math.min(b.open,b.close))throw Error('INVALID_OHLC_BAR');
 }
 return true;
}

// Confirmed pivots are emitted only after the reversal threshold is observed.
// Each pivot carries confirmedAt so a caller can avoid look-ahead in replay.
export function detectPivots({bars,reversalPct=5,minimumBars=2}){
 validateBars(bars);if(!(reversalPct>0&&reversalPct<=100))throw Error('REVERSAL_PCT_OUT_OF_RANGE');
 if(!Number.isInteger(minimumBars)||minimumBars<1||minimumBars>100)throw Error('MINIMUM_BARS_OUT_OF_RANGE');
 const out=[];let trend=0,extreme=bars[0],extremeIndex=0,anchor=bars[0],anchorIndex=0;
 for(let i=1;i<bars.length;i++){
  const b=bars[i];
  if(trend>=0){if(b.high>extreme.high){extreme=b;extremeIndex=i;}
   if(i>extremeIndex&&(extreme.high-b.low)/extreme.high*100>=reversalPct&&extremeIndex-anchorIndex>=minimumBars){
    out.push(point(extreme,extremeIndex,'high',bars[i].time));anchor=b;anchorIndex=i;extreme=b;extremeIndex=i;trend=-1;continue;
   }
  }
  if(trend<=0){if(b.low<extreme.low){extreme=b;extremeIndex=i;}
   if(i>extremeIndex&&(b.high-extreme.low)/extreme.low*100>=reversalPct&&extremeIndex-anchorIndex>=minimumBars){
    out.push(point(extreme,extremeIndex,'low',bars[i].time));anchor=b;anchorIndex=i;extreme=b;extremeIndex=i;trend=1;continue;
   }
  }
 }
 return {method:'percent-reversal-confirmed-v1',reversalPct,minimumBars,pivots:out,unconfirmedTail:{time:extreme.time,price:trend>=0?extreme.high:extreme.low,direction:trend>=0?'candidate_high':'candidate_low'},lookaheadPolicy:'A pivot is known only at confirmedAt; the final extreme is explicitly unconfirmed.'};
}
function point(bar,index,type,confirmedAt){return {time:bar.time,price:type==='high'?bar.high:bar.low,type,index,confirmedAt};}

export function validateImpulse(points,{direction='up',diagonal=false}={}){
 if(!Array.isArray(points)||points.length!==6)throw Error('IMPULSE_REQUIRES_WAVE_0_TO_5');
 const expected=direction==='up'?['low','high','low','high','low','high']:['high','low','high','low','high','low'];
 const violations=[];for(let i=0;i<6;i++){if(!Number.isFinite(points[i].price)||points[i].price<=0)throw Error('INVALID_WAVE_PRICE');if(points[i].type!==expected[i])violations.push(`P${i}_EXPECTED_${expected[i].toUpperCase()}`);const t=Date.parse(points[i].time);if(!Number.isFinite(t))throw Error(`P${i}_INVALID_TIME`);if(i&&t<=Date.parse(points[i-1].time))violations.push(`P${i}_TIME_NOT_AFTER_P${i-1}`);}
 const p=points.map(x=>x.price);const s=direction==='up'?1:-1;const q=p.map(x=>s*x);
 if(q[2]<q[0])violations.push('WAVE_2_CROSSES_WAVE_1_ORIGIN');
 if(q[3]<=q[1])violations.push('WAVE_3_DOES_NOT_EXTEND_BEYOND_WAVE_1');
 const lengths=[Math.abs(p[1]-p[0]),Math.abs(p[3]-p[2]),Math.abs(p[5]-p[4])];
 if(lengths[1]<=Math.min(lengths[0],lengths[2]))violations.push('WAVE_3_IS_SHORTEST');
 if(!diagonal&&q[4]<q[1])violations.push('WAVE_4_OVERLAPS_WAVE_1_PRICE_TERRITORY');
 return {status:violations.length?'RULES_VIOLATED':'RULES_PASS_CANDIDATE_ONLY',direction,diagonal,violations,legLengths:lengths,invalidation:points[0].price,disclaimer:'规则通过只表示该组标注未违反所选基础规则，不证明浪型正确或未来方向。复杂调整、延伸浪和对角线需人工复核。'};
}

export function projectPrice({start,end,direction='up',ratios=DEFAULT_RATIOS,mode='retracement'}){
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<=0||end<=0||start===end)throw Error('INVALID_PRICE_ANCHORS');
 if(!['up','down'].includes(direction)||!['retracement','extension'].includes(mode))throw Error('INVALID_PROJECTION_MODE');
 if(!Array.isArray(ratios)||!ratios.length||ratios.some(x=>!Number.isFinite(x)||x<=0||x>5))throw Error('INVALID_FIBONACCI_RATIOS');
 const span=Math.abs(end-start),sign=direction==='up'?1:-1;
 const levels=ratios.map(r=>({ratio:r,price:round(mode==='retracement'?end-sign*span*r:end+sign*span*r)}));
 return {mode,direction,anchors:{start,end},levels,interpretation:'纯比例计算结果；比例不是普遍市场定律，不构成支撑、目标或反转保证。'};
}

export function projectTime({startTime,endTime,direction='forward',ratios=[0.382,0.618,1,1.618],unit='bars',barTimes=[]}){
 const a=Date.parse(startTime),b=Date.parse(endTime);if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a)throw Error('INVALID_TIME_ANCHORS');
 if(!['forward','backward'].includes(direction)||!['bars','calendar_days'].includes(unit))throw Error('INVALID_TIME_PROJECTION');
 if(unit==='bars'&&(!Array.isArray(barTimes)||barTimes.length<2))throw Error('BAR_TIMES_REQUIRED_FOR_BAR_PROJECTION');if(unit==='bars'&&barTimes.some((x,i)=>!Number.isFinite(Date.parse(x))||(i&&Date.parse(x)<=Date.parse(barTimes[i-1]))))throw Error('BAR_TIMES_MUST_BE_VALID_AND_ORDERED');
 if(ratios.some(x=>!Number.isFinite(x)||x<=0||x>5))throw Error('INVALID_FIBONACCI_RATIOS');
 const duration=unit==='calendar_days'?(b-a)/86400000:Math.abs(indexAtOrBefore(barTimes,endTime)-indexAtOrBefore(barTimes,startTime));
 const windows=ratios.map(r=>{const offset=Math.round(duration*r)*(direction==='forward'?1:-1);if(unit==='calendar_days'){const t=new Date((direction==='forward'?b:a)+offset*86400000).toISOString().slice(0,10);return {ratio:r,start:t,end:t,unit};}const i=indexAtOrBefore(barTimes,endTime)+(direction==='forward'?1:-1)*Math.max(1,Math.round(duration*r));const t=barTimes[Math.max(0,Math.min(barTimes.length-1,i))];return {ratio:r,start:t,end:t,unit};});
 return {unit,direction,anchors:{startTime,endTime},windows,interpretation:unit==='bars'?'窗口按传入交易K线索引计算。':'窗口按日历天计算。均为待观察时间窗口，非确定性转折日期。'};
}
function indexAtOrBefore(xs,t){let found=-1;for(let i=0;i<xs.length;i++)if(Date.parse(xs[i])<=Date.parse(t))found=i;else break;if(found<0)throw Error('TIME_ANCHOR_OUTSIDE_BAR_RANGE');return found;}

export function rightSideStructure(points){
 const lows=points.filter(p=>p.type==='low'),highs=points.filter(p=>p.type==='high');if(lows.length<2||highs.length<2)return {status:'INSUFFICIENT_CONFIRMED_PIVOTS',conditions:{H2AboveH1:null,L2AboveL1:null,closeAboveH2:null},action:'watch'};
 const L1=lows.at(-2),L2=lows.at(-1),H1=highs.at(-2),H2=highs.at(-1);const hh=H2.price>H1.price,hl=L2.price>L1.price;
 const sequence=[H1,L1,H2,L2];if(!sequence.every((x,i)=>i===0||Date.parse(x.time)>Date.parse(sequence[i-1].time)))return {status:'PIVOT_SEQUENCE_NOT_H1_L1_H2_L2',conditions:{H2AboveH1:hh,L2AboveL1:hl,closeAboveH2:null},action:'watch'};
 return {status:hh&&hl?'RIGHT_SIDE_STRUCTURE_CANDIDATE':'STRUCTURE_NOT_CONFIRMED',points:{H1,H2,L1,L2},conditions:{H2AboveH1:hh,L2AboveL1:hl,closeAboveH2:null},breakoutRule:'等待后续已完成K线收盘价高于H2；本结果不视为触发。',action:hh&&hl?'wait_for_H2_close_breakout':'watch',invalidation:L2.price,disclaimer:'枢轴依据所传数据和方法生成；用户可编辑。结构候选不是自动买入信号。'};
}
