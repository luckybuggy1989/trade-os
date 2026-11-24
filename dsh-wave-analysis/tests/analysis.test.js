import test from 'node:test';import assert from 'node:assert/strict';
import { detectPivots,validateImpulse,projectPrice,projectTime,rightSideStructure } from '../lib/analysis.js';
const bars=[
 {time:'2026-01-01',open:100,high:101,low:99,close:100},
 {time:'2026-01-02',open:100,high:110,low:100,close:109},
 {time:'2026-01-03',open:108,high:109,low:103,close:104},
 {time:'2026-01-04',open:104,high:105,low:98,close:99},
 {time:'2026-01-05',open:99,high:103,low:99,close:102},
 {time:'2026-01-06',open:102,high:111,low:101,close:110},
 {time:'2026-01-07',open:110,high:110,low:105,close:106},
 {time:'2026-01-08',open:106,high:112,low:105,close:111},
 {time:'2026-01-09',open:111,high:111,low:104,close:105},
 {time:'2026-01-10',open:105,high:114,low:104,close:113}
];
test('pivot detector marks confirmation time and keeps tail unconfirmed',()=>{const r=detectPivots({bars,reversalPct:5,minimumBars:1});assert.ok(r.pivots.length>=2);assert.ok(r.pivots.every(p=>p.confirmedAt>p.time));assert.equal(r.unconfirmedTail.direction,'candidate_high');});
test('bar validation rejects out of order and impossible OHLC',()=>{assert.throws(()=>detectPivots({bars:[...bars].reverse()}),/STRICTLY_ORDERED/);assert.throws(()=>detectPivots({bars:bars.map((b,i)=>i?b:{...b,high:90})}),/INVALID_OHLC/);});
test('impulse validator detects wave 2 origin break',()=>{const r=validateImpulse([{time:'1',price:10,type:'low'},{time:'2',price:20,type:'high'},{time:'3',price:9,type:'low'},{time:'4',price:24,type:'high'},{time:'5',price:18,type:'low'},{time:'6',price:30,type:'high'}]);assert.ok(r.violations.includes('WAVE_2_CROSSES_WAVE_1_ORIGIN'));});
test('price projections are explicit calculations',()=>{const r=projectPrice({start:100,end:120,direction:'up',mode:'retracement',ratios:[0.5]});assert.equal(r.levels[0].price,110);});
test('time projection separates trading bars and calendar days',()=>{const r=projectTime({startTime:'2026-01-01',endTime:'2026-01-03',direction:'forward',unit:'bars',barTimes:['2026-01-01','2026-01-02','2026-01-03','2026-01-04'],ratios:[1]});assert.equal(r.windows[0].start,'2026-01-04');});
test('right-side setup awaits a close above H2',()=>{const r=rightSideStructure([{type:'high',price:15,time:'2026-01-01'},{type:'low',price:10,time:'2026-01-02'},{type:'high',price:16,time:'2026-01-03'},{type:'low',price:12,time:'2026-01-04'}]);assert.equal(r.status,'RIGHT_SIDE_STRUCTURE_CANDIDATE');assert.equal(r.conditions.closeAboveH2,null);});
