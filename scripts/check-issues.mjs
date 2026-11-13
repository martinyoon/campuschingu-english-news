// check-issues v3
// 사용법: node scripts/check-issues.mjs issues/current.json
import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2];
if (!file) { console.error('usage: node scripts/check-issues.mjs issues/current.json'); process.exit(2); }
const errs = [];
const e = (m) => errs.push(m);
const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
const str = (x, max, where, req = true) => {
  if (x === undefined) { if (req) e(`${where}: 없음`); return; }
  if (typeof x !== 'string' || x.trim() === '') { e(`${where}: 빈 글자`); return; }
  if (x.length > max) e(`${where}: ${max}자 넘음(${x.length})`);
};
const int = (x, lo, hi, where) => {
  if (!Number.isInteger(x) || x < lo || x > hi) e(`${where}: 정수 ${lo}~${hi} 아님(${x})`);
};
const only = (o, keys, where) => {
  if (!isObj(o)) { e(`${where}: 객체 아님`); return false; }
  for (const k of Object.keys(o)) if (!keys.includes(k)) e(`${where}: 모르는 칸 ${k}`);
  return true;
};
const httpsUrl = (u, where) => {
  str(u, 500, where);
  if (typeof u === 'string' && !/^https:\/\//.test(u)) e(`${where}: https 아님`);
};
const FIELDS = `job-hunt intern startup invest housing marketing accounting trade office ai coding chips robots gamedev security gadgets data bigtech cars battery architecture materials aviation energy transport industrial-design manufacturing space physics chemistry biology climate math ocean fossils animals medicine nursing pharma brain mind fitness nutrition sleep public-health global law usa europe rights green-policy media population safety history philosophy books language art classical design religion archaeology movies drama kpop pop-music games anime creators fashion celebs soccer baseball basketball esports travel food pets relationships living campus-life study-abroad tuition grad-school funding publishing research-ethics higher-ed academic-jobs`.split(/\s+/);
const SECTIONS = ['jobs', 'tech', 'money', 'world', 'campus', 'culture'];
const TAGS = ['모두의 화제', '한국에 직접', '생활에 바로', '의견 갈림', '파장 큼'];
const words = (s) => (s.match(/[A-Za-z0-9]+/g) || []);

function srcLine(s, where) {
  if (!only(s, ['kind', 'name', 'title', 'url'], where)) return;
  if (!['article', 'report'].includes(s.kind)) e(`${where}.kind`);
  str(s.name, 60, where + '.name'); str(s.title, 200, where + '.title'); httpsUrl(s.url, where + '.url');
}

let d;
try { d = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (x) { console.error('JSON 읽기 실패: ' + x.message); process.exit(1); }
const dir = path.dirname(file);

if (only(d, ['edition', 'publishedAt', 'sourceCount', 'reportCount', 'numbers', 'issues', 'rare', 'unbacked'], 'edition-file')) {
  const ed = d.edition;
  if (!/^\d{4}-\d{2}-\d{2}-(am|pm)$/.test(ed || '')) e('edition 꼴');
  if (typeof d.publishedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(d.publishedAt)) e('publishedAt 꼴');
  int(d.sourceCount, 1, 99999, 'sourceCount'); int(d.reportCount, 0, 99999, 'reportCount');
  if (!Array.isArray(d.numbers) || d.numbers.length > 6) e('numbers 6칸 이하');
  else d.numbers.forEach((n, i) => { if (only(n, ['value', 'caption', 'source'], `numbers[${i}]`)) { str(n.value, 24, `numbers[${i}].value`); str(n.caption, 60, `numbers[${i}].caption`); str(n.source, 60, `numbers[${i}].source`); } });
  if (!Array.isArray(d.issues) || d.issues.length < 8 || d.issues.length > 200) e('issues 8~200개');
  const keys = new Set();
  (d.issues || []).forEach((it, i) => {
    const w = `issues[${i}]`;
    if (!only(it, ['key', 'section', 'field', 'tag', 'desk', 'title', 'gist', 'gistKo', 'easyKo', 'paragraphs', 'pro', 'glosses', 'views', 'heads', 'sources', 'lines', 'opinion', 'quiz', 'job', 'talk', 'story'], w)) return;
    if (!new RegExp(`^${ed}-\\d{1,3}$`).test(it.key || '')) e(`${w}.key 꼴`);
    if (keys.has(it.key)) e(`${w}.key 겹침`); keys.add(it.key);
    if (!SECTIONS.includes(it.section)) e(`${w}.section`);
    if (!FIELDS.includes(it.field)) e(`${w}.field(${it.field})`);
    if (it.desk !== undefined && !['korea', 'ai'].includes(it.desk)) e(`${w}.desk`);
    if (it.tag !== undefined && !TAGS.includes(it.tag)) e(`${w}.tag`);
    str(it.title, 120, w + '.title'); str(it.gist, 300, w + '.gist'); str(it.gistKo, 300, w + '.gistKo'); str(it.easyKo, 300, w + '.easyKo');
    // paragraphs
    let story = '';
    if (!Array.isArray(it.paragraphs) || it.paragraphs.length < 3 || it.paragraphs.length > 8) e(`${w}.paragraphs 3~8`);
    else it.paragraphs.forEach((p, j) => {
      const pw = `${w}.paragraphs[${j}]`;
      if (!only(p, ['en', 'ko', 'sents'], pw)) return;
      str(p.en, 900, pw + '.en'); str(p.ko, 600, pw + '.ko');
      if (typeof p.en === 'string') story += p.en + '\n';
      if (!Array.isArray(p.sents) || p.sents.length < 1 || p.sents.length > 16) { e(`${pw}.sents 1~16`); return; }
      p.sents.forEach((s, k) => { if (only(s, ['en', 'ko'], `${pw}.sents[${k}]`)) { str(s.en, 400, `${pw}.sents[${k}].en`); str(s.ko, 300, `${pw}.sents[${k}].ko`); } });
      if (p.sents.map((s) => s.en).join(' ') !== p.en) e(`${pw}: sents en 이음 != en`);
    });
    let proText = '';
    if (it.pro === undefined) e(`${w}.pro 없음`);
    else if (!Array.isArray(it.pro) || !Array.isArray(it.paragraphs) || it.pro.length !== it.paragraphs.length) e(`${w}.pro 개수가 paragraphs 와 다름`);
    else {
      let pw = 0;
      it.pro.forEach((p, j) => { if (only(p, ['en'], `${w}.pro[${j}]`)) { str(p.en, 1400, `${w}.pro[${j}].en`); if (typeof p.en === 'string') { proText += p.en + '\n'; pw += words(p.en).length; } } });
      if (pw < 150 || pw > 900) e(`${w}: pro 낱말 ${pw} (150~900)`);
    }
    const wc = words(story).length;
    if (wc < 150 || wc > 650) e(`${w}: 이야기 낱말 ${wc} (150~650)`);
    // glosses
    if (!Array.isArray(it.glosses)) e(`${w}.glosses 없음`);
    else {
      if (it.glosses.length > 80) e(`${w}.glosses 80 넘음`);
      const sl = (story + '\n' + proText).toLowerCase();
      it.glosses.forEach((g, k) => { if (only(g, ['text', 'meaning', 'level'], `${w}.glosses[${k}]`)) { str(g.text, 40, `${w}.glosses[${k}].text`); str(g.meaning, 60, `${w}.glosses[${k}].meaning`); int(g.level, 0, 4, `${w}.glosses[${k}].level`); if (typeof g.text === 'string' && !sl.includes(g.text.toLowerCase())) e(`${w}.glosses[${k}] "${g.text}" 이야기에 없음`); } });
    }
    // views
    if (!Array.isArray(it.views) || it.views.length < 1 || it.views.length > 8) e(`${w}.views 1~8`);
    else it.views.forEach((v, k) => { if (only(v, ['source', 'stance', 'view'], `${w}.views[${k}]`)) { str(v.source, 60, `${w}.views[${k}].source`); if (!['pos', 'neu', 'neg'].includes(v.stance)) e(`${w}.views[${k}].stance`); str(v.view, 200, `${w}.views[${k}].view`); } });
    if (it.heads !== undefined) {
      if (!Array.isArray(it.heads) || it.heads.length > 6) e(`${w}.heads 0~6`);
      else it.heads.forEach((h, k) => { if (only(h, ['source', 'title', 'url'], `${w}.heads[${k}]`)) { str(h.source, 60, `${w}.heads[${k}].source`); str(h.title, 200, `${w}.heads[${k}].title`); httpsUrl(h.url, `${w}.heads[${k}].url`); } });
    }
    // sources
    if (!Array.isArray(it.sources) || it.sources.length < 1 || it.sources.length > 200) e(`${w}.sources 1~200`);
    else { const us = new Set(); it.sources.forEach((s, k) => { srcLine(s, `${w}.sources[${k}]`); if (us.has(s && s.url)) e(`${w}.sources[${k}] url 겹침`); us.add(s && s.url); }); }
    // lines
    const L = it.lines;
    if (only(L, ['why', 'since', 'agree', 'split', 'life', 'next', 'keyNumber'], w + '.lines')) {
      if (!Array.isArray(L.why) || L.why.length < 1 || L.why.length > 3) e(`${w}.lines.why 1~3`); else L.why.forEach((x, k) => str(x, 200, `${w}.lines.why[${k}]`));
      for (const k of ['since', 'split']) str(L[k], 200, `${w}.lines.${k}`, false);
      for (const k of ['agree', 'life', 'next']) str(L[k], 200, `${w}.lines.${k}`);
      if (L.keyNumber !== undefined && only(L.keyNumber, ['value', 'caption', 'source'], w + '.lines.keyNumber')) { str(L.keyNumber.value, 24, w + '.keyNumber.value'); str(L.keyNumber.caption, 60, w + '.keyNumber.caption'); str(L.keyNumber.source, 60, w + '.keyNumber.source'); }
    }
    // opinion
    const O = it.opinion;
    if (only(O, ['pos', 'neu', 'neg'], w + '.opinion')) {
      for (const k of ['pos', 'neu', 'neg']) int(O[k], 0, 500, `${w}.opinion.${k}`);
      const sum = O.pos + O.neu + O.neg;
      if (sum < 1 || (Array.isArray(it.sources) && sum > it.sources.length)) e(`${w}.opinion 합 ${sum} (1~sources ${it.sources && it.sources.length})`);
    }
    // quiz
    if (!Array.isArray(it.quiz) || it.quiz.length !== 3) e(`${w}.quiz 정확히 3`);
    else it.quiz.forEach((q, k) => {
      const qw = `${w}.quiz[${k}]`;
      if (!only(q, ['q', 'qKo', 'choices', 'answer', 'why'], qw)) return;
      str(q.q, 160, qw + '.q'); str(q.qKo, 120, qw + '.qKo'); str(q.why, 200, qw + '.why'); int(q.answer, 0, 2, qw + '.answer');
      if (!Array.isArray(q.choices) || q.choices.length !== 3) e(`${qw}.choices 3개`);
      else { q.choices.forEach((c, m) => str(c, 120, `${qw}.choices[${m}]`)); const n = q.choices.map((c) => String(c).trim().toLowerCase()); if (new Set(n).size !== 3) e(`${qw}.choices 겹침`); }
    });
    str(it.job, 160, w + '.job');
    const T = it.talk;
    if (only(T, ['q', 'qKo', 'answer', 'answerKo', 'phrases'], w + '.talk')) {
      str(T.q, 200, w + '.talk.q'); str(T.qKo, 160, w + '.talk.qKo'); str(T.answer, 700, w + '.talk.answer'); str(T.answerKo, 500, w + '.talk.answerKo');
      if (!Array.isArray(T.phrases) || T.phrases.length < 1 || T.phrases.length > 3) e(`${w}.talk.phrases 1~3`);
      else T.phrases.forEach((p, k) => { if (only(p, ['en', 'ko'], `${w}.talk.phrases[${k}]`)) { str(p.en, 60, `${w}.talk.phrases[${k}].en`); str(p.ko, 60, `${w}.talk.phrases[${k}].ko`); } });
    }
    if (it.story !== undefined && only(it.story, ['prev', 'n'], w + '.story')) {
      const m = /^(\d{4}-\d{2}-\d{2}-(am|pm))-\d{1,3}$/.exec(it.story.prev || '');
      if (!m) e(`${w}.story.prev 꼴`);
      else {
        if (!(m[1] < ed)) e(`${w}.story.prev 판이 이번 판보다 앞이 아님`);
        let ok = false, pn;
        try { const a = JSON.parse(fs.readFileSync(path.join(dir, 'archive', m[1] + '.json'), 'utf8')); const f = a.issues.find((x) => x.key === it.story.prev); if (f) { ok = true; pn = f.story ? f.story.n : undefined; } } catch { /* */ }
        if (!ok) e(`${w}.story.prev 지난 판에 없음`);
        else if (it.story.n !== (pn ? pn + 1 : 2)) e(`${w}.story.n 틀림`);
      }
      int(it.story.n, 2, 99, w + '.story.n');
    }
  });
  const keySet = new Set((d.issues || []).map((x) => x.key));
  const rs = (r, w) => srcLine({ kind: r.kind, name: r.name, title: r.title, url: r.url }, w);
  if (!Array.isArray(d.rare) || d.rare.length > 5) e('rare 5줄 이하');
  else d.rare.forEach((r, i) => { if (only(r, ['title', 'titleKo', 'reports', 'articles'], `rare[${i}]`)) { str(r.title, 160, `rare[${i}].title`); str(r.titleKo, 160, `rare[${i}].titleKo`); if (!Array.isArray(r.reports) || r.reports.length < 1 || r.reports.length > 8) e(`rare[${i}].reports 1~8`); else r.reports.forEach((x, k) => rs(x, `rare[${i}].reports[${k}]`)); int(r.articles, 0, 9, `rare[${i}].articles`); } });
  if (!Array.isArray(d.unbacked) || d.unbacked.length > 5) e('unbacked 5줄 이하');
  else d.unbacked.forEach((r, i) => { if (only(r, ['key', 'articles'], `unbacked[${i}]`)) { if (!keySet.has(r.key)) e(`unbacked[${i}].key 없음`); int(r.articles, 1, 999, `unbacked[${i}].articles`); } });
}
// index.json
try {
  const ip = path.join(dir, 'index.json');
  if (fs.existsSync(ip)) {
    const ix = JSON.parse(fs.readFileSync(ip, 'utf8'));
    if (!Array.isArray(ix) || ix.length > 200) e('index.json 배열 200줄 이하');
    else ix.forEach((r, i) => { if (only(r, ['edition', 'publishedAt', 'lead'], `index[${i}]`)) { if (!/^\d{4}-\d{2}-\d{2}-(am|pm)$/.test(r.edition || '')) e(`index[${i}].edition`); str(r.publishedAt, 40, `index[${i}].publishedAt`); str(r.lead, 120, `index[${i}].lead`); } });
  }
} catch (x) { e('index.json 읽기 실패: ' + x.message); }

if (errs.length) { console.log(errs.join('\n')); process.exit(1); }
console.log('OK');
