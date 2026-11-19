import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../lib/storage.js';
import { callTool } from '../lib/tools.js';

function setup(){const dir=mkdtempSync(join(tmpdir(),'dsh-macro-'));const store=new Store(dir);return {dir,store}}
function row(day,value){return {indicator:'shibor_7d',value,unit:'%',observedPeriod:day,releasedAt:day,source:'chinamoney',sourceUrl:'https://www.chinamoney.com.cn/example',frequency:'daily',quality:'official'}}
test('SQLite persists observations and de-duplicates the same source row',()=>{const {dir,store}=setup();try{assert.equal(store.insertObservation(row('2026-01-01',1.2)),true);assert.equal(store.insertObservation(row('2026-01-01',1.2)),false);assert.equal(store.countObservations(),1)}finally{store.close();rmSync(dir,{recursive:true,force:true})}});
test('macro trend uses effective observations and calculates 1/5 periods',async()=>{const {dir,store}=setup();try{for(let i=1;i<=7;i++)store.insertObservation(row(`2026-01-${String(i).padStart(2,'0')}`,i));const result=await callTool(store,'macro_trend',{indicators:['shibor_7d']});assert.equal(result[0].changes['1'].value,1);assert.equal(result[0].changes['5'].value,5);assert.equal(result[0].direction_5,'UP');assert.equal(result[0].direction_20,'INSUFFICIENT')}finally{store.close();rmSync(dir,{recursive:true,force:true})}});
test('daily brief exposes missing observations rather than inventing zero',async()=>{const {dir,store}=setup();try{const result=await callTool(store,'macro_daily_brief',{asOf:'2026-01-01'});assert.equal(result.indicators.length,12);assert.equal(result.indicators.every(x=>x.status==='UNAVAILABLE'),true);assert.match(result.summary,/证据不足/)}finally{store.close();rmSync(dir,{recursive:true,force:true})}});
test('snapshots append and comparison marks insufficient history',async()=>{const {dir,store}=setup();try{const result=await callTool(store,'macro_snapshot_save',{asOf:'2026-01-01'});assert.equal(result.status,'SAVED');const compare=await callTool(store,'macro_snapshot_compare',{count:2});assert.equal(compare.status,'INSUFFICIENT_HISTORY')}finally{store.close();rmSync(dir,{recursive:true,force:true})}});
test('period range rejects reversed dates',async()=>{const {dir,store}=setup();try{await assert.rejects(()=>callTool(store,'macro_collect_official',{startDate:'2026-02-01',endDate:'2026-01-01'}),/INVALID_DATE_RANGE/)}finally{store.close();rmSync(dir,{recursive:true,force:true})}});
