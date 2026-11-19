import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { createHash } from 'node:crypto';

export class Store {
  constructor(directory) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const file = `${directory}/industry-opportunity.sqlite`;
    this.db = new DatabaseSync(file);
    try { chmodSync(file, 0o600); } catch {}
    this.db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS evidence(id INTEGER PRIMARY KEY, sector TEXT NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL, published_at TEXT NOT NULL, event_at TEXT, organization TEXT NOT NULL, summary TEXT NOT NULL, source_url TEXT NOT NULL, source_grade TEXT NOT NULL, status TEXT NOT NULL, fingerprint TEXT NOT NULL UNIQUE, collected_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS evidence_sector_date ON evidence(sector,published_at);
      CREATE TABLE IF NOT EXISTS market_data(id INTEGER PRIMARY KEY, market TEXT NOT NULL, sector TEXT NOT NULL, symbol TEXT NOT NULL, day TEXT NOT NULL, close REAL NOT NULL, volume REAL, benchmark_return REAL, source TEXT NOT NULL, source_url TEXT NOT NULL, quality TEXT NOT NULL, fingerprint TEXT NOT NULL UNIQUE);
      CREATE INDEX IF NOT EXISTS market_sector_day ON market_data(market,sector,day);
      CREATE TABLE IF NOT EXISTS mappings(id INTEGER PRIMARY KEY, us_sector TEXT NOT NULL, cn_sector TEXT NOT NULL, rationale TEXT NOT NULL, source_url TEXT NOT NULL, updated_at TEXT NOT NULL, fingerprint TEXT NOT NULL UNIQUE);
      CREATE TABLE IF NOT EXISTS snapshots(id INTEGER PRIMARY KEY, day TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL);`);
  }
  addEvidence(e) {
    const fp = createHash('sha256').update(JSON.stringify([e.sector,e.kind,e.title,e.publishedAt,e.sourceUrl])).digest('hex');
    return this.db.prepare(`INSERT OR IGNORE INTO evidence(sector,kind,title,published_at,event_at,organization,summary,source_url,source_grade,status,fingerprint,collected_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(e.sector,e.kind,e.title,e.publishedAt,e.eventAt||null,e.organization,e.summary,e.sourceUrl,e.sourceGrade,e.status,fp,new Date().toISOString()).changes > 0;
  }
  evidence(sector, since, limit=200) { return this.db.prepare('SELECT * FROM evidence WHERE (?="" OR sector=?) AND published_at>=? ORDER BY published_at DESC,id DESC LIMIT ?').all(sector,sector,since,limit); }
  addMarket(r) {
    const fp=createHash('sha256').update(JSON.stringify([r.market,r.sector,r.symbol,r.day,r.close,r.source])).digest('hex');
    return this.db.prepare('INSERT OR IGNORE INTO market_data(market,sector,symbol,day,close,volume,benchmark_return,source,source_url,quality,fingerprint) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(r.market,r.sector,r.symbol,r.day,r.close,r.volume??null,r.benchmarkReturn??null,r.source,r.sourceUrl,r.quality,fp).changes>0;
  }
  market(market,sector,limit=200){return this.db.prepare('SELECT * FROM market_data WHERE market=? AND (?="" OR sector=?) ORDER BY day DESC,id DESC LIMIT ?').all(market,sector,sector,limit).reverse();}
  coverage(){return {evidence:this.db.prepare('SELECT sector,kind,COUNT(*) count,MAX(published_at) latest FROM evidence GROUP BY sector,kind ORDER BY sector,kind').all(),market:this.db.prepare('SELECT market,sector,COUNT(*) count,MAX(day) latest,MAX(source) source FROM market_data GROUP BY market,sector ORDER BY market,sector').all(),mappings:this.db.prepare('SELECT us_sector,cn_sector,rationale,source_url,updated_at FROM mappings ORDER BY cn_sector,us_sector').all()};}
  save(day,payload){this.db.prepare('INSERT INTO snapshots(day,payload,created_at) VALUES(?,?,?)').run(day,JSON.stringify(payload),new Date().toISOString());}
  snapshots(n=20){return this.db.prepare('SELECT day,payload,created_at FROM snapshots ORDER BY day DESC,id DESC LIMIT ?').all(n).map(x=>({...x,payload:JSON.parse(x.payload)}));}
  close(){this.db.close();}
}

