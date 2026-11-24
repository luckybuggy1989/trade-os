import { mkdirSync,chmodSync } from 'node:fs';import { DatabaseSync } from 'node:sqlite';import { randomUUID } from 'node:crypto';
export class Store{
 constructor(dir){mkdirSync(dir,{recursive:true,mode:0o700});const f=`${dir}/portfolio-strategy.sqlite`;this.db=new DatabaseSync(f);try{chmodSync(f,0o600)}catch{};this.db.exec(`PRAGMA journal_mode=WAL;CREATE TABLE IF NOT EXISTS profile(id INTEGER PRIMARY KEY CHECK(id=1),payload TEXT NOT NULL,updated_at TEXT NOT NULL);CREATE TABLE IF NOT EXISTS budgets(id TEXT PRIMARY KEY,as_of TEXT NOT NULL,payload TEXT NOT NULL,created_at TEXT NOT NULL);CREATE TABLE IF NOT EXISTS allocations(id TEXT PRIMARY KEY,context_id TEXT NOT NULL,allocation_key TEXT NOT NULL,symbol TEXT NOT NULL,payload TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(context_id,allocation_key));`);}
 profile(){const r=this.db.prepare('SELECT payload,updated_at FROM profile WHERE id=1').get();return r?{...JSON.parse(r.payload),updated_at:r.updated_at}:null;}
 setProfile(p){this.db.prepare('INSERT INTO profile(id,payload,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at').run(JSON.stringify(p),new Date().toISOString());}
 saveContext(c){this.db.prepare('INSERT INTO budgets VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(c.id,c.asOf,JSON.stringify(c),new Date().toISOString());}
 context(id){const r=this.db.prepare('SELECT payload FROM budgets WHERE id=?').get(id);return r?JSON.parse(r.payload):null;}
 contexts(n){return this.db.prepare('SELECT id,as_of,payload,created_at FROM budgets ORDER BY created_at DESC LIMIT ?').all(n).map(r=>({...r,payload:JSON.parse(r.payload)}));}
 addAllocation(c,key,symbol,p){const id=randomUUID();this.db.prepare('INSERT INTO allocations VALUES(?,?,?,?,?,?)').run(id,c,key,symbol,JSON.stringify(p),new Date().toISOString());return id;}
 hasAllocation(c,key){return !!this.db.prepare('SELECT 1 FROM allocations WHERE context_id=? AND allocation_key=?').get(c,key);}
 allocations(c,n){return this.db.prepare('SELECT id,context_id,allocation_key,symbol,payload,created_at FROM allocations WHERE context_id=? ORDER BY created_at DESC LIMIT ?').all(c,n).map(r=>({...r,payload:JSON.parse(r.payload)}));}
 close(){this.db.close();}
}
