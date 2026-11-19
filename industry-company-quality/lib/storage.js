import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { createHash } from 'node:crypto';

export class Store {
  constructor(dir){mkdirSync(dir,{recursive:true,mode:0o700});const file=`${dir}/industry-company-quality.sqlite`;this.db=new DatabaseSync(file);try{chmodSync(file,0o600)}catch{}
    this.db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS evidence(id INTEGER PRIMARY KEY,industry TEXT NOT NULL,company TEXT NOT NULL,category TEXT NOT NULL,title TEXT NOT NULL,fact TEXT NOT NULL,period TEXT NOT NULL,published_at TEXT NOT NULL,source_grade TEXT NOT NULL,source_url TEXT NOT NULL,limitations TEXT NOT NULL,collected_at TEXT NOT NULL,fingerprint TEXT NOT NULL UNIQUE);
      CREATE INDEX IF NOT EXISTS evidence_lookup ON evidence(industry,company,published_at);
      CREATE TABLE IF NOT EXISTS chain_maps(id INTEGER PRIMARY KEY,industry TEXT NOT NULL,as_of TEXT NOT NULL,payload TEXT NOT NULL,source_urls TEXT NOT NULL,updated_at TEXT NOT NULL,fingerprint TEXT NOT NULL UNIQUE);
      CREATE INDEX IF NOT EXISTS chain_lookup ON chain_maps(industry,as_of);
      CREATE TABLE IF NOT EXISTS company_financials(id INTEGER PRIMARY KEY,company TEXT NOT NULL,code TEXT NOT NULL,as_of TEXT NOT NULL,payload TEXT NOT NULL,source_url TEXT NOT NULL,created_at TEXT NOT NULL,fingerprint TEXT NOT NULL UNIQUE);`);
  }
  addEvidence(e){const fp=createHash('sha256').update(JSON.stringify([e.industry,e.company,e.category,e.title,e.fact,e.period,e.publishedAt,e.sourceUrl])).digest('hex');return this.db.prepare('INSERT OR IGNORE INTO evidence(industry,company,category,title,fact,period,published_at,source_grade,source_url,limitations,collected_at,fingerprint) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(e.industry,e.company||'',e.category,e.title,e.fact,e.period||'',e.publishedAt,e.sourceGrade,e.sourceUrl,e.limitations||'',new Date().toISOString(),fp).changes>0;}
  evidence(industry,company,since,limit=200){return this.db.prepare("SELECT industry,company,category,title,fact,period,published_at,source_grade,source_url,limitations,collected_at FROM evidence WHERE industry=? AND (?='' OR company=?) AND published_at>=? ORDER BY published_at DESC,id DESC LIMIT ?").all(industry,company,company,since,limit);}
  saveMap(industry,asOf,payload,urls){const fp=createHash('sha256').update(JSON.stringify([industry,asOf,payload,urls])).digest('hex');return this.db.prepare('INSERT OR IGNORE INTO chain_maps(industry,as_of,payload,source_urls,updated_at,fingerprint) VALUES(?,?,?,?,?,?)').run(industry,asOf,JSON.stringify(payload),JSON.stringify(urls),new Date().toISOString(),fp).changes>0;}
  map(industry,asOf){const r=this.db.prepare('SELECT * FROM chain_maps WHERE industry=? AND as_of<=? ORDER BY as_of DESC,id DESC LIMIT 1').get(industry,asOf);return r?{...r,payload:JSON.parse(r.payload),source_urls:JSON.parse(r.source_urls)}:null;}
  saveFinancials(company,code,asOf,payload,url){const fp=createHash('sha256').update(JSON.stringify([company,code,asOf,payload,url])).digest('hex');return this.db.prepare('INSERT OR IGNORE INTO company_financials(company,code,as_of,payload,source_url,created_at,fingerprint) VALUES(?,?,?,?,?,?,?)').run(company,code,asOf,JSON.stringify(payload),url,new Date().toISOString(),fp).changes>0;}
  latestFinancials(company,code,asOf){const r=this.db.prepare("SELECT * FROM company_financials WHERE (?='' OR company=?) AND (?='' OR code=?) AND as_of<=? ORDER BY as_of DESC,id DESC LIMIT 1").get(company,company,code,code,asOf);return r?{...r,payload:JSON.parse(r.payload)}:null;}
  close(){this.db.close();}
}

