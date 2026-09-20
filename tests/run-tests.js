/* Tankebænken jsdom test suite.
   Run: cd tests && npm install && node run-tests.js
   Covers: seeding, stable ids, no-reseed on reload, stone card parse/file round-trip,
   quarry capture, reading log + week stats, return marking, export/import round-trip,
   malformed import rejection, cache-version consistency, no stale content,
   journal append/parse round-trip, promote-to-quarry, merge-by-id, token isolation,
   and sync against a fake GitHub (create, append, stale-SHA retry, offline). */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

let passed = 0, failed = 0;
function ok(cond, name){
  if(cond){ passed++; console.log('  ✓ ' + name); }
  else { failed++; console.error('  ✗ FAIL: ' + name); }
}
function section(name){ console.log('\n' + name); }

/* A stand-in for the GitHub Contents API: an in-memory file store with shas,
   so sync is tested without a network and without a real repo. */
function fakeGitHub(){
  const files = new Map();
  let n = 0;
  const store = { files, failNext: 0, throwNext: false };
  store.fetch = async (url, opts) => {
    if(store.throwNext) throw new Error('network down');
    const p = decodeURIComponent(String(url).match(/\/contents\/(.+)$/)[1]);
    opts = opts || {};
    if(!opts.method || opts.method === 'GET'){
      const f = files.get(p);
      if(!f) return {ok:false, status:404, json: async()=>({})};
      return {ok:true, status:200, json: async()=>({
        content: Buffer.from(f.content,'utf8').toString('base64'), sha: f.sha})};
    }
    if(opts.method === 'PUT'){
      const body = JSON.parse(opts.body);
      if(store.failNext > 0){ store.failNext--; return {ok:false, status:409, json: async()=>({})}; }
      const cur = files.get(p);
      if(cur && body.sha !== cur.sha) return {ok:false, status:409, json: async()=>({})};
      if(!cur && body.sha)            return {ok:false, status:409, json: async()=>({})};
      files.set(p, {content: Buffer.from(body.content,'base64').toString('utf8'), sha: 'sha'+(++n)});
      return {ok:true, status:200, json: async()=>({})};
    }
    return {ok:false, status:405, json: async()=>({})};
  };
  return store;
}

async function makeDom(existingStorage){
  const dom = new JSDOM(html, {
    url: 'https://mikkelmeinert.github.io/tankebaenken/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window){
      if(typeof window.TextEncoder === 'undefined'){
        window.TextEncoder = TextEncoder; window.TextDecoder = TextDecoder;
      }
      if(existingStorage){
        for(const [k,v] of Object.entries(existingStorage)) window.localStorage.setItem(k, v);
      }
    }
  });
  // jsdom fires DOMContentLoaded asynchronously; wait for boot() to have run.
  for(let i = 0; i < 100 && !(dom.window.TB && dom.window.TB.state); i++){
    await new Promise(r => setTimeout(r, 5));
  }
  if(!(dom.window.TB && dom.window.TB.state)) throw new Error('app did not boot');
  return dom;
}

async function main(){

/* ---------- 1. fresh boot seeds session 1 ---------- */
section('1. Fresh boot: seed data');
{
  const dom = await makeDom();
  const TB = dom.window.TB;
  const S = TB.state;
  ok(!!TB, 'TB test hook exposed');
  ok(S.stones.length === 1, 'exactly one seeded stone');
  ok(S.stones[0].id === 'st-0001', 'voice stone has stable id st-0001');
  ok(/voice/i.test(S.stones[0].title), 'voice stone title present');
  ok(S.stones[0].verdict === 'split', 'voice stone verdict is split');
  ok(S.quarry.length === 5, 'five seeded spare stones in quarry');
  ok(S.quarry.every(q => q.parentStoneId === 'st-0001'), 'all seeded spares linked to voice stone');
  ok(S.books.length === 2, 'Goffman + Austin seeded');
  ok(S.books.every(b => b.earnedBy === 'st-0001'), 'seeded books earned by the voice stone');
  ok(S.counters.stone === 1 && S.counters.quarry === 5 && S.counters.book === 2, 'counters match seed');
  ok(S.stones[0].ret.queued.length > 0 && S.stones[0].ret.returned === false, 'Return queued, not yet returned');
  const stored = dom.window.localStorage.getItem(TB.LS_KEY);
  ok(!!stored, 'state persisted to localStorage under single key');
}

/* ---------- 2. reload with existing data: no reseed, ids survive ---------- */
section('2. Reload: history survives regeneration');
{
  const dom1 = await makeDom();
  const TB1 = dom1.window.TB;
  TB1.addQuarry('An idea captured between sessions', 'podcast');
  const snapshot = dom1.window.localStorage.getItem(TB1.LS_KEY);
  const dom2 = await makeDom({ [TB1.LS_KEY]: snapshot });
  const TB2 = dom2.window.TB;
  ok(TB2.state.stones.length === 1, 'no duplicate seeding on reload');
  ok(TB2.state.quarry.length === 6, 'captured quarry item survived reload');
  ok(TB2.state.quarry.some(q => q.text.includes('captured between sessions')), 'captured text intact');
  ok(TB2.state.stones[0].id === 'st-0001', 'stable id survives reload');
}

/* ---------- 3. stone card: parse + file round trip ---------- */
section('3. Stone card round trip');
{
  const dom = await makeDom();
  const TB = dom.window.TB;
  const card = [
    'STONE CARD v1',
    'TITLE: Attention is a trainable muscle',
    'SOURCE: Podcast conversation',
    'TYPE: explanation',
    'VERDICT: hypothesis',
    'VERDICT NOTE: Survives if training transfers beyond the trained task.',
    'STRIP: Weak: practice improves the practiced task. Strong: general attention capacity grows.',
    'DIG: Assumes transfer across domains; assumes a single attention resource.',
    'BREAK: Competing: task-specific skill, motivation, measurement artifacts.',
    'FOLLOW: If true, heavy meditators should show transfer on novel tasks.',
    'PLACE: Reminds of working-memory training literature (mostly failed transfer).',
    'READING PATH: ',
    'RETURN: Bring back to the colleague who claimed it',
    'SPARES:',
    '- Does "muscle" framing itself smuggle in the transfer assumption?',
    '- Measurement: how would you even isolate attention from motivation?'
  ].join('\n');
  const parsed = TB.parseStoneCard(card);
  ok(parsed.ok, 'card parses');
  ok(parsed.stone.title === 'Attention is a trainable muscle', 'title parsed');
  ok(parsed.stone.verdict === 'hypothesis', 'verdict parsed');
  ok(parsed.stone.sessionType === 'explanation', 'type parsed');
  ok(parsed.stone.spares.length === 2, 'spares parsed');
  ok(parsed.stone.steps.break.includes('Competing'), 'break step parsed');
  ok(parsed.stone.ret.queued.includes('colleague'), 'return parsed');

  const before = TB.state.quarry.length;
  const res = TB.fileStoneCard(card);
  ok(res.ok, 'card files as stone');
  ok(TB.state.stones.length === 2, 'stone count is now 2');
  ok(TB.state.stones[0].id === 'st-0002', 'new stone gets next stable id');
  ok(TB.state.quarry.length === before + 2, 'spares landed in quarry');
  ok(TB.state.quarry.filter(q => q.parentStoneId === 'st-0002').length === 2, 'spares linked to new stone');

  const bad = TB.fileStoneCard('random text with no header');
  ok(bad.ok === false, 'non-card text rejected with error');
  const noTitle = TB.parseStoneCard('STONE CARD v1\nSOURCE: x');
  ok(noTitle.ok === false, 'card without TITLE rejected');
}

/* ---------- 4. quarry capture ---------- */
section('4. Quarry');
{
  const dom = await makeDom();
  const TB = dom.window.TB;
  const q = TB.addQuarry('  A quick thought  ', 'gym');
  ok(q && q.id === 'q-0006', 'capture gets next stable id');
  ok(q.text === 'A quick thought', 'text trimmed');
  ok(TB.addQuarry('   ') === null, 'empty capture rejected');
  TB.dropQuarry(q.id);
  ok(TB.state.quarry.find(x=>x.id===q.id).status === 'dropped', 'drop works');
  TB.dropQuarry(q.id);
  ok(TB.state.quarry.find(x=>x.id===q.id).status === 'open', 'restore works');
}

/* ---------- 5. reading log + week stats ---------- */
section('5. Reading + week strip');
{
  const dom = await makeDom();
  const TB = dom.window.TB;
  const book = TB.state.books[0];
  const r = TB.logReading(book.id, 25);
  ok(!!r && r.id === 'r-0001', 'reading entry gets stable id');
  ok(TB.state.books.find(b=>b.id===book.id).status === 'reading', 'book auto-moves shelf → reading');
  ok(TB.state.settings.lastMinutes === 25 && TB.state.settings.lastBookId === book.id, 'prefill memory updated');
  const w = TB.weekStats();
  ok(w.reading === 1, 'week strip counts this week\'s reading');
  ok(typeof w.bench === 'number', 'week strip has bench count');
  ok(TB.logReading('nonexistent', 25) === null, 'logging against unknown book rejected');
  const wk1 = TB.isoWeekKey(new Date('2026-08-17T12:00:00'));
  const wk2 = TB.isoWeekKey(new Date('2026-08-23T12:00:00'));
  const wk3 = TB.isoWeekKey(new Date('2026-08-24T12:00:00'));
  ok(wk1 === wk2 && wk2 !== wk3, 'ISO week boundaries correct (Mon 17 Aug – Sun 23 Aug 2026)');
}

/* ---------- 6. the Return ---------- */
section('6. The Return');
{
  const dom = await makeDom();
  const TB = dom.window.TB;
  const st = TB.markReturned('st-0001', 'Great talk — he conceded the token/type split.');
  ok(st.ret.returned === true, 'return marked');
  ok(st.ret.note.includes('token/type'), 'return note stored');
  ok(!!st.ret.date, 'return date stamped');
}

/* ---------- 7. export / import round trip ---------- */
section('7. Backup round trip');
{
  const dom = await makeDom();
  const TB = dom.window.TB;
  TB.addQuarry('survives the round trip', '');
  const exported = TB.exportJSON();
  const dom2 = await makeDom();
  const TB2 = dom2.window.TB;
  const res = TB2.importJSON(exported);
  ok(res.ok, 'import accepts valid backup');
  ok(TB2.state.quarry.some(q => q.text === 'survives the round trip'), 'imported data intact');
  ok(JSON.stringify(TB2.state.stones) === JSON.stringify(TB.state.stones), 'stones identical after round trip');
  ok(TB2.importJSON('{not json').ok === false, 'malformed JSON rejected');
  ok(TB2.importJSON('{"hello":1}').ok === false, 'valid JSON but non-backup rejected');
  ok(TB2.state.quarry.some(q => q.text === 'survives the round trip'), 'failed import does not clobber state');
}

/* ---------- 8. deploy hygiene ---------- */
section('8. Deploy hygiene');
{
  const dom = await makeDom();
  const TB = dom.window.TB;
  const cacheMatch = swSrc.match(/CACHE\s*=\s*'tankebaenken-([0-9.]+)'/);
  ok(!!cacheMatch, 'sw.js has versioned CACHE constant');
  ok(cacheMatch && cacheMatch[1] === TB.APP_VERSION, 'sw CACHE version matches APP_VERSION (bump both every deploy)');
  ok(!/TODO|FIXME|@@NEXT@@|lorem ipsum/.test(html), 'no stale placeholder content in index.html');
  ok(html.includes('manifest.webmanifest'), 'manifest linked');
  ok(html.includes('apple-touch-icon'), 'iOS icon linked');
  const kickoff = TB.buildKickoff();
  ok(kickoff.includes('STONE CARD v1'), 'kickoff instructs ending with a stone card');
  ok(kickoff.includes('Open quarry'), 'kickoff surfaces the quarry');
  const tmpl = TB.stoneCardTemplate();
  ok(TB.parseStoneCard(tmpl.replace('TITLE: ', 'TITLE: x')).ok, 'card template itself parses');
}

/* ---------- 9. journal: append-only prose ---------- */
section('9. Journal: append-only prose');
{
  const dom = await makeDom();
  const TB = dom.window.TB;
  const e1 = TB.addJournal('Første note. Æbler, øl og åer.', 'i sengen');
  ok(!!e1 && e1.id === 'j-0001', 'first entry gets stable id j-0001');
  ok(e1.synced === false, 'a new entry starts unsynced');
  ok(TB.state.counters.journal === 1, 'journal counter advanced');
  ok(TB.addJournal('   ', '') === null, 'empty entry rejected');
  const block = TB.journalBlock(e1);
  ok(block.indexOf('j-0001') > -1, 'markdown heading carries the id');
  const parsed = TB.parseJournalMd(block);
  ok(parsed.length === 1, 'block parses back to one entry');
  ok(parsed[0].id === 'j-0001', 'id round-trips');
  ok(parsed[0].text === e1.text, 'text round-trips with Danish characters intact');
  ok(parsed[0].source === 'i sengen', 'source round-trips');
  const first = TB.appendEntries(null, [e1]);
  const e2 = TB.addJournal('Anden note.', '');
  const both = TB.appendEntries(first, [e2]);
  ok(both.startsWith(first.replace(/\s*$/,'')), 'appending preserves every existing byte');
  const reparsed = TB.parseJournalMd(both);
  ok(reparsed.length === 2, 'both entries present after append');
  ok(reparsed[0].id === 'j-0001' && reparsed[1].id === 'j-0002', 'entry order preserved');
  const q = TB.promoteJournal('j-0001');
  ok(!!q && q.fromJournal === 'j-0001', 'promote creates a quarry item linked to the entry');
  ok(TB.state.quarry.filter(x => x.fromJournal === 'j-0001').length === 1, 'exactly one quarry item created');
  ok(TB.promoteJournal('j-0001') === null, 'promoting the same entry twice is a no-op');
  ok(TB.isPromoted('j-0001') === true, 'entry reports as promoted');
}

/* ---------- 10. merge and token isolation ---------- */
section('10. Merge and token isolation');
{
  const dom = await makeDom();
  const TB = dom.window.TB;
  const local  = [{id:'q-0001', text:'local',       updatedAt:'2026-09-20T10:00:00.000Z'},
                  {id:'q-0002', text:'only local',  createdAt:'2026-09-01T00:00:00.000Z'}];
  const remote = [{id:'q-0001', text:'remote',      updatedAt:'2026-09-19T10:00:00.000Z'},
                  {id:'q-0003', text:'only remote', createdAt:'2026-09-18T00:00:00.000Z'}];
  const merged = TB.mergeLists(local, remote);
  ok(merged.length === 3, 'merge keeps every distinct id');
  ok(merged.find(x=>x.id==='q-0001').text === 'local', 'the newer updatedAt wins');
  ok(!!merged.find(x=>x.id==='q-0003'), 'a remote-only item survives the merge');
  ok(!!merged.find(x=>x.id==='q-0002'), 'a local-only item survives the merge');
  const tie = TB.mergeLists([{id:'a', text:'local',  updatedAt:'2026-09-20T10:00:00.000Z'}],
                            [{id:'a', text:'remote', updatedAt:'2026-09-20T10:00:00.000Z'}]);
  ok(tie[0].text === 'local', 'this device wins a tie');
  const ms = TB.mergeState(
    {stones:[],quarry:[],books:[],readingLog:[],counters:{stone:1,quarry:5,book:2,reading:1,journal:3},settings:{theme:'mine'}},
    {stones:[],quarry:[],books:[],readingLog:[],counters:{stone:2,quarry:4,book:2,reading:0,journal:1},settings:{theme:'theirs'}});
  ok(ms.counters.stone === 2 && ms.counters.quarry === 5 && ms.counters.journal === 3,
     'counters take the max of both sides, so ids never collide');
  TB.setToken('github_pat_SECRET_VALUE');
  const forRemote = TB.stateForRemote(TB.state);
  ok(forRemote.journal === undefined, 'journal prose is never written into state.json');
  ok(forRemote.sync === undefined, 'device-local sync bookkeeping stays local');
  ok(TB.exportJSON().indexOf('SECRET') === -1, 'the token never appears in the export JSON');
  ok(JSON.stringify(TB.state).indexOf('SECRET') === -1, 'the token is not in the state object at all');
  ok(TB.getToken() === 'github_pat_SECRET_VALUE', 'the token is still readable on this device');
  TB.setToken('');
}

/* ---------- 11. sync against a fake GitHub ---------- */
section('11. Sync against a fake GitHub');
{
  const dom = await makeDom();
  const TB = dom.window.TB;
  const gh = fakeGitHub();
  TB.__setFetch(gh.fetch);
  const month = TB.monthKey();
  const jpath = 'journal/' + month + '.md';

  let r = await TB.syncNow({render:false});
  ok(r.ok === false && /no token/.test(r.reason), 'sync refuses to run without a token');

  TB.setToken('github_pat_test');
  TB.addJournal('Første synkroniserede note — æøå.', 'på en båd');
  r = await TB.syncNow({render:false});
  ok(r.ok === true, 'first sync succeeds against an empty repo');
  const created = gh.files.get(jpath);
  ok(!!created, 'the month file is created');
  ok(created.content.indexOf('æøå') > -1, 'Danish characters survive the base64 round trip');
  ok(created.content.indexOf('på en båd') > -1, 'the source line is written to markdown');
  const sfile = gh.files.get('state.json');
  ok(!!sfile, 'state.json is created');
  ok(JSON.parse(sfile.content).journal === undefined, 'no prose in the remote state');
  ok(sfile.content.indexOf('github_pat_test') === -1, 'the token never reaches the repo');
  ok(TB.state.journal.entries.every(e=>e.synced), 'entries are marked synced');
  ok(TB.state.sync.pending === false, 'pending clears after a successful sync');

  const before = created.content;
  TB.addJournal('Anden note.', '');
  r = await TB.syncNow({render:false});
  const after = gh.files.get(jpath).content;
  ok(r.ok === true, 'second sync succeeds');
  ok(after.indexOf('Første synkroniserede note') > -1, 'the first entry is still there after appending');
  ok(after.startsWith(before.replace(/\s*$/,'')), 'appending preserved the earlier bytes exactly');
  ok(TB.parseJournalMd(after).length === 2, 'two entries in the file');

  gh.failNext = 1;
  TB.addJournal('Tredje note.', '');
  r = await TB.syncNow({render:false});
  ok(r.ok === true, 'a stale-SHA rejection is refetched, retried, and then succeeds');
  ok(TB.parseJournalMd(gh.files.get(jpath).content).length === 3, 'nothing was lost to the retry');

  gh.throwNext = true;
  const offline = TB.addJournal('Offline note.', '');
  r = await TB.syncNow({render:false});
  ok(r.ok === false, 'sync fails while the network is down');
  ok(TB.state.journal.entries.find(x=>x.id===offline.id).synced === false, 'the offline entry stays unsynced');
  ok(TB.state.sync.pending === true, 'it is still marked pending');
  const raw = JSON.parse(dom.window.localStorage.getItem(TB.LS_KEY));
  ok(raw.journal.entries.some(x=>x.text==='Offline note.'), 'the offline entry survives in localStorage');
  gh.throwNext = false;
  r = await TB.syncNow({render:false});
  ok(r.ok === true, 'it pushes as soon as the network is back');
  ok(gh.files.get(jpath).content.indexOf('Offline note.') > -1, 'the offline entry reached the repo');
  ok(TB.parseJournalMd(gh.files.get(jpath).content).length === 4, 'all four entries present, none duplicated');
  TB.setToken('');
}

} // end main

/* ---------- summary ---------- */
main().then(() => {
  console.log('\n' + '─'.repeat(40));
  console.log(passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}).catch(e => { console.error('SUITE ERROR:', e); process.exit(1); });
