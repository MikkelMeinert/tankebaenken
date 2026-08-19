/* Tankebænken jsdom test suite.
   Run: cd tests && npm install && node run-tests.js
   Covers: seeding, stable ids, no-reseed on reload, stone card parse/file round-trip,
   quarry capture, reading log + week stats, return marking, export/import round-trip,
   malformed import rejection, cache-version consistency, no stale content. */
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

async function makeDom(existingStorage){
  const dom = new JSDOM(html, {
    url: 'https://mikkelmeinert.github.io/tankebaenken/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window){
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

} // end main

/* ---------- summary ---------- */
main().then(() => {
  console.log('\n' + '─'.repeat(40));
  console.log(passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}).catch(e => { console.error('SUITE ERROR:', e); process.exit(1); });
