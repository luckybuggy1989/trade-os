import { mkdirSync, chmodSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
export class Store{
 constructor(dir){mkdirSync(dir,{recursive:true,mode:0o700});const file=`${dir}/wave-analysis.sqlite`;this.db=new DatabaseSync(file);try{chmodSync(file,0o600)}catch{};this.db.exec(`PRAGMA journal_mode=WAL;CREATE TABLE IF NOT EXISTS snapshots(id TEXT PRIMARY KEY,symbol TEXT NOT NULL,market TEXT NOT NULL,timeframe TEXT NOT NULL,degree TEXT NOT NULL,as_of TEXT NOT NULL,available_at TEXT NOT NULL,source TEXT NOT NULL,data_version TEXT NOT NULL,method_version TEXT NOT NULL,status TEXT NOT NULL,payload TEXT NOT NULL,created_at TEXT NOT NULL);CREATE INDEX IF NOT EXISTS wave_snapshots_lookup ON snapshots(symbol,timeframe,created_at);`);}
 save(x){const id=randomUUID();this.db.prepare('INSERT INTO snapshots VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,x.symbol,x.market,x.timeframe,x.degree,x.asOf,x.availableAt,x.source,x.dataVersion,x.methodVersion,x.status,JSON.stringify(x.payload),new Date().toISOString());return id;}
 list(symbol,timeframe,limit){return this.db.prepare('SELECT id,symbol,market,timeframe,degree,as_of,available_at,source,data_version,method_version,status,payload,created_at FROM snapshots WHERE symbol=? AND (? IS NULL OR timeframe=?) ORDER BY created_at DESC LIMIT ?').all(symbol,timeframe,timeframe,limit).map(x=>({...x,payload:JSON.parse(x.payload)}));}
 close(){this.db.close();}
}
