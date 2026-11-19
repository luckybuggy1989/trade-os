import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { createHash } from 'node:crypto';

export class Store {
  constructor(directory) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const file = `${directory}/macro.sqlite`;
    this.db = new DatabaseSync(file);
    try { chmodSync(file, 0o600); } catch {}
    this.db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS observations (
        id INTEGER PRIMARY KEY, indicator TEXT NOT NULL, value REAL NOT NULL,
        unit TEXT NOT NULL, observed_period TEXT NOT NULL, released_at TEXT NOT NULL,
        collected_at TEXT NOT NULL, source TEXT NOT NULL, source_url TEXT NOT NULL,
        frequency TEXT NOT NULL, quality TEXT NOT NULL, fingerprint TEXT NOT NULL UNIQUE);
      CREATE INDEX IF NOT EXISTS observations_series ON observations(indicator, observed_period, id);
      CREATE TABLE IF NOT EXISTS snapshots (
        id INTEGER PRIMARY KEY, snapshot_date TEXT NOT NULL, created_at TEXT NOT NULL,
        payload TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS snapshots_by_day ON snapshots(snapshot_date, id);
      CREATE TABLE IF NOT EXISTS collection_runs (
        id INTEGER PRIMARY KEY, started_at TEXT NOT NULL, ended_at TEXT NOT NULL,
        status TEXT NOT NULL, sources TEXT NOT NULL);
    `);
  }
  insertObservation(row) {
    if (!Number.isFinite(row.value)) throw Error('INVALID_VALUE');
    const canonical = [row.indicator,row.value,row.unit,row.observedPeriod,row.releasedAt,row.source,row.sourceUrl,row.frequency,row.quality];
    const fingerprint = createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
    const r = this.db.prepare(`INSERT OR IGNORE INTO observations(indicator,value,unit,observed_period,released_at,collected_at,source,source_url,frequency,quality,fingerprint)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(row.indicator,row.value,row.unit,row.observedPeriod,row.releasedAt,new Date().toISOString(),row.source,row.sourceUrl,row.frequency,row.quality,fingerprint);
    return r.changes > 0;
  }
  observations(indicator, limit = 90) {
    return this.db.prepare('SELECT * FROM observations WHERE indicator=? ORDER BY observed_period DESC,id DESC LIMIT ?').all(indicator,limit).reverse();
  }
  countObservations() { return this.db.prepare('SELECT COUNT(*) AS n FROM observations').get().n; }
  saveSnapshot(day, created, payload) { this.db.prepare('INSERT INTO snapshots(snapshot_date,created_at,payload) VALUES(?,?,?)').run(day,created,JSON.stringify(payload)); }
  snapshots(limit) { return this.db.prepare('SELECT * FROM snapshots ORDER BY snapshot_date DESC,id DESC LIMIT ?').all(limit).map(r=>({...r,payload:JSON.parse(r.payload)})); }
  status(sources) {
    const by=this.db.prepare('SELECT indicator,COUNT(*) AS observations,MAX(observed_period) AS latest_period,MAX(released_at) AS latest_release,MAX(collected_at) AS last_collected FROM observations GROUP BY indicator ORDER BY indicator').all();
    const known=['dr007','shibor_overnight','shibor_7d','lpr_1y','lpr_5y','m1_yoy','m2_yoy','social_financing_yoy','cpi_yoy','ppi_yoy','pmi_manufacturing','gov_bond_net_financing'];
    return {status:'OK',storage:'SQLite on device',total_observations:this.countObservations(),coverage:by,missing:known.filter(x=>!by.some(r=>r.indicator===x)),sources};
  }
  close(){this.db.close();}
}
