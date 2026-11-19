import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { createHash } from 'node:crypto';

export class Store {
  constructor(dir){
    mkdirSync(dir,{recursive:true,mode:0o700});const file=`${dir}/a-share-market.sqlite`;
    this.db=new DatabaseSync(file);try{chmodSync(file,0o600)}catch{}
    this.db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS bars(id INTEGER PRIMARY KEY,kind TEXT NOT NULL,symbol TEXT NOT NULL,tf TEXT NOT NULL,day TEXT NOT NULL,open REAL,high REAL,low REAL,close REAL,volume REAL,amount REAL,turnover REAL,pct REAL,source TEXT NOT NULL,source_url TEXT NOT NULL,adjustment TEXT NOT NULL,collected_at TEXT NOT NULL,fingerprint TEXT NOT NULL UNIQUE);
      CREATE INDEX IF NOT EXISTS bars_lookup ON bars(kind,symbol,tf,day);
      CREATE TABLE IF NOT EXISTS chip_snapshots(id INTEGER PRIMARY KEY,symbol TEXT NOT NULL,day TEXT NOT NULL,provider TEXT NOT NULL,algorithm TEXT NOT NULL,payload TEXT NOT NULL,source_url TEXT NOT NULL,imported_at TEXT NOT NULL,fingerprint TEXT NOT NULL UNIQUE);
      CREATE INDEX IF NOT EXISTS chips_lookup ON chip_snapshots(symbol,day);
      CREATE TABLE IF NOT EXISTS snapshots(id INTEGER PRIMARY KEY,kind TEXT NOT NULL,day TEXT NOT NULL,payload TEXT NOT NULL,created_at TEXT NOT NULL);`);
  }
  addBars(kind,symbol,tf,rows,meta){let n=0;const stmt=this.db.prepare('INSERT OR IGNORE INTO bars(kind,symbol,tf,day,open,high,low,close,volume,amount,turnover,pct,source,source_url,adjustment,collected_at,fingerprint) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');for(const r of rows){const fp=createHash('sha256').update(JSON.stringify([kind,symbol,tf,r.day,r.open,r.high,r.low,r.close,r.volume,r.amount,r.turnover,meta.adjustment])).digest('hex');n+=stmt.run(kind,symbol,tf,r.day,r.open,r.high,r.low,r.close,r.volume,r.amount,r.turnover,r.pct,meta.source,meta.url,meta.adjustment,new Date().toISOString(),fp).changes;}return n;}
  bars(kind,symbol,tf,start,end){return this.db.prepare('SELECT * FROM bars WHERE kind=? AND symbol=? AND tf=? AND day BETWEEN ? AND ? ORDER BY day,id').all(kind,symbol,tf,start,end);}
  latestChips(symbol,day){return this.db.prepare('SELECT * FROM chip_snapshots WHERE symbol=? AND day<=? ORDER BY day DESC,id DESC LIMIT 1').get(symbol,day);}
  saveChips(symbol,day,provider,algorithm,payload,url){const fp=createHash('sha256').update(JSON.stringify([symbol,day,provider,algorithm,payload])).digest('hex');return this.db.prepare('INSERT OR IGNORE INTO chip_snapshots(symbol,day,provider,algorithm,payload,source_url,imported_at,fingerprint) VALUES(?,?,?,?,?,?,?,?)').run(symbol,day,provider,algorithm,JSON.stringify(payload),url,new Date().toISOString(),fp).changes>0;}
  saveSnapshot(kind,day,payload){this.db.prepare('INSERT INTO snapshots(kind,day,payload,created_at) VALUES(?,?,?,?)').run(kind,day,JSON.stringify(payload),new Date().toISOString());}
  close(){this.db.close();}
}

