import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';

export class Store{
 constructor(dir){mkdirSync(dir,{recursive:true,mode:0o700});const file=`${dir}/short-term-positions.sqlite`;this.db=new DatabaseSync(file);try{chmodSync(file,0o600)}catch{}
  this.db.exec(`PRAGMA journal_mode=WAL;
   CREATE TABLE IF NOT EXISTS drafts(id TEXT PRIMARY KEY,mode TEXT NOT NULL,source_type TEXT NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL,raw_text TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS positions(symbol TEXT PRIMARY KEY,name TEXT NOT NULL,quantity REAL NOT NULL,available_quantity REAL,avg_cost REAL,current_price REAL,market_value REAL,industry TEXT,as_of TEXT NOT NULL,source_type TEXT NOT NULL,confidence REAL);
   CREATE TABLE IF NOT EXISTS risk_profile(id INTEGER PRIMARY KEY CHECK(id=1),payload TEXT NOT NULL,updated_at TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS account_state(id INTEGER PRIMARY KEY CHECK(id=1),total_equity REAL,cash_available REAL,as_of TEXT NOT NULL,source_type TEXT NOT NULL,confidence REAL);
   CREATE TABLE IF NOT EXISTS plans(id TEXT PRIMARY KEY,as_of TEXT NOT NULL,payload TEXT NOT NULL,created_at TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS executions(id INTEGER PRIMARY KEY,symbol TEXT NOT NULL,side TEXT NOT NULL,quantity REAL NOT NULL,price REAL NOT NULL,fees REAL NOT NULL,executed_at TEXT NOT NULL,source_type TEXT NOT NULL,note TEXT NOT NULL);`);
 }
 stage(mode,sourceType,payload,rawText=''){const id=randomUUID();this.db.prepare('INSERT INTO drafts(id,mode,source_type,payload,status,created_at,raw_text) VALUES(?,?,?,?,?,?,?)').run(id,mode,sourceType,JSON.stringify(payload),'PENDING',new Date().toISOString(),rawText);return id;}
 draft(id){const r=this.db.prepare('SELECT * FROM drafts WHERE id=?').get(id);return r?{...r,payload:JSON.parse(r.payload)}:null;}
 commitDraft(id){const d=this.draft(id);if(!d)throw Error('DRAFT_NOT_FOUND');if(d.status!=='PENDING')throw Error('DRAFT_NOT_PENDING');const positions=d.payload.positions;const up=this.db.prepare(`INSERT INTO positions(symbol,name,quantity,available_quantity,avg_cost,current_price,market_value,industry,as_of,source_type,confidence) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(symbol) DO UPDATE SET name=excluded.name,quantity=excluded.quantity,available_quantity=excluded.available_quantity,avg_cost=excluded.avg_cost,current_price=excluded.current_price,market_value=excluded.market_value,industry=excluded.industry,as_of=excluded.as_of,source_type=excluded.source_type,confidence=excluded.confidence`);
  this.db.exec('BEGIN IMMEDIATE');try{if(d.mode==='replace')this.db.prepare('DELETE FROM positions').run();for(const p of positions)up.run(p.symbol,p.name||p.symbol,p.quantity,p.availableQuantity??null,p.averageCost??null,p.currentPrice??null,p.marketValue??(p.currentPrice===undefined||p.currentPrice===null?null:p.quantity*p.currentPrice),p.industry??null,d.payload.asOf,d.source_type,p.confidence??null);if(d.payload.accountSummary)this.setAccount(d.payload.accountSummary,d.source_type);this.db.prepare("UPDATE drafts SET status='COMMITTED' WHERE id=?").run(id);this.db.exec('COMMIT');}catch(e){this.db.exec('ROLLBACK');throw e;}return this.positions();}
 positions(){return this.db.prepare('SELECT * FROM positions ORDER BY symbol').all();}
 account(){return this.db.prepare('SELECT * FROM account_state WHERE id=1').get()||null;}
 setAccount(a,sourceType='manual'){this.db.prepare('INSERT INTO account_state(id,total_equity,cash_available,as_of,source_type,confidence) VALUES(1,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET total_equity=excluded.total_equity,cash_available=excluded.cash_available,as_of=excluded.as_of,source_type=excluded.source_type,confidence=excluded.confidence').run(a.totalEquity??null,a.cashAvailable??null,a.asOf,sourceType,a.confidence??null);}
 profile(){const r=this.db.prepare('SELECT payload,updated_at FROM risk_profile WHERE id=1').get();return r?{...JSON.parse(r.payload),updated_at:r.updated_at}:null;}
 saveProfile(payload){this.db.prepare('INSERT INTO risk_profile(id,payload,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at').run(JSON.stringify(payload),new Date().toISOString());}
 savePlan(asOf,payload){const id=randomUUID();this.db.prepare('INSERT INTO plans(id,as_of,payload,created_at) VALUES(?,?,?,?)').run(id,asOf,JSON.stringify(payload),new Date().toISOString());return id;}
 plans(n){return this.db.prepare('SELECT id,as_of,payload,created_at FROM plans ORDER BY created_at DESC LIMIT ?').all(n).map(x=>({...x,payload:JSON.parse(x.payload)}));}
 execution(e){this.db.prepare('INSERT INTO executions(symbol,side,quantity,price,fees,executed_at,source_type,note) VALUES(?,?,?,?,?,?,?,?)').run(e.symbol,e.side,e.quantity,e.price,e.fees||0,e.executedAt,e.sourceType,e.note||'');}
 sha(value){return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
 close(){this.db.close();}
}

