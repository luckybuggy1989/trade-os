import { DatabaseSync } from 'node:sqlite';
import { mkdirSync,chmodSync } from 'node:fs';
import { createHash } from 'node:crypto';

export class Store{
  constructor(directory){mkdirSync(directory,{recursive:true,mode:0o700});const file=`${directory}/global-macro.sqlite`;this.db=new DatabaseSync(file);try{chmodSync(file,0o600)}catch{}this.db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS observations(id INTEGER PRIMARY KEY,indicator TEXT NOT NULL,value REAL NOT NULL,unit TEXT NOT NULL,observed_period TEXT NOT NULL,released_at TEXT NOT NULL,collected_at TEXT NOT NULL,source TEXT NOT NULL,source_url TEXT NOT NULL,frequency TEXT NOT NULL,quality TEXT NOT NULL,fingerprint TEXT NOT NULL UNIQUE);
    CREATE INDEX IF NOT EXISTS observations_series ON observations(indicator,observed_period,id);
    CREATE TABLE IF NOT EXISTS snapshots(id INTEGER PRIMARY KEY,snapshot_date TEXT NOT NULL,created_at TEXT NOT NULL,payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS policy_events(id INTEGER PRIMARY KEY,region TEXT NOT NULL,bank TEXT NOT NULL,event_date TEXT NOT NULL,title TEXT NOT NULL,decision TEXT NOT NULL,source_url TEXT NOT NULL,created_at TEXT NOT NULL,fingerprint TEXT NOT NULL UNIQUE);
    CREATE INDEX IF NOT EXISTS events_by_date ON policy_events(event_date);`)}
  insert(r){if(!Number.isFinite(r.value))throw Error('INVALID_VALUE');const fp=createHash('sha256').update(JSON.stringify([r.indicator,r.value,r.unit,r.observedPeriod,r.releasedAt,r.source,r.sourceUrl,r.frequency,r.quality])).digest('hex');const x=this.db.prepare('INSERT OR IGNORE INTO observations(indicator,value,unit,observed_period,released_at,collected_at,source,source_url,frequency,quality,fingerprint) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(r.indicator,r.value,r.unit,r.observedPeriod,r.releasedAt,new Date().toISOString(),r.source,r.sourceUrl,r.frequency,r.quality,fp);return x.changes>0}
  series(id,limit=250,endDay='9999-12-31'){return this.db.prepare('SELECT * FROM observations WHERE indicator=? AND observed_period<=? AND released_at<=? ORDER BY observed_period DESC,id DESC LIMIT ?').all(id,endDay,endDay,limit).reverse()}
  all(){return this.db.prepare('SELECT indicator,COUNT(*) n,MAX(observed_period) latest_period,MAX(released_at) latest_release,MAX(collected_at) last_collected FROM observations GROUP BY indicator ORDER BY indicator').all()}
  count(){return this.db.prepare('SELECT COUNT(*) n FROM observations').get().n}
  save(day,payload){this.db.prepare('INSERT INTO snapshots(snapshot_date,created_at,payload) VALUES(?,?,?)').run(day,new Date().toISOString(),JSON.stringify(payload))}
  snapshots(n){return this.db.prepare('SELECT * FROM snapshots ORDER BY snapshot_date DESC,id DESC LIMIT ?').all(n).map(x=>({...x,payload:JSON.parse(x.payload)}))}
  saveEvent(e){const fp=createHash('sha256').update(JSON.stringify([e.region,e.bank,e.eventDate,e.title,e.decision,e.sourceUrl])).digest('hex');const r=this.db.prepare('INSERT OR IGNORE INTO policy_events(region,bank,event_date,title,decision,source_url,created_at,fingerprint) VALUES(?,?,?,?,?,?,?,?)').run(e.region,e.bank,e.eventDate,e.title,e.decision,e.sourceUrl,new Date().toISOString(),fp);return r.changes>0}
  events(start,end){return this.db.prepare('SELECT region,bank,event_date,title,decision,source_url,created_at FROM policy_events WHERE event_date BETWEEN ? AND ? ORDER BY event_date DESC,id DESC').all(start,end)}
  close(){this.db.close()}
}
