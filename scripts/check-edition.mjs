// check-edition v7
// 캠퍼스친구 「나의 영어신문」 판 파일 검사 · 사용법: node scripts/check-edition.mjs editions/current.json
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
const errs = [];
const bad = (m) => errs.push(m);
const file = process.argv[2] ?? 'editions/current.json';
let d;
try { d = JSON.parse(readFileSync(file, 'utf8')); }
catch (e) { console.log('JSON을 읽을 수 없음: ' + e.message); process.exit(1); }
const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
const only = (o, req, where, opt = []) => { if (!isObj(o)) { bad(where + ': 객체가 아님'); return false; }
  for (const k of Object.keys(o)) if (!req.includes(k) && !opt.includes(k)) bad(where + ': 모르는 칸 ' + k);
  for (const k of req) if (!(k in o)) bad(where + ': 칸 없음 ' + k); return true; };
const str = (v, where, max) => { if (typeof v !== 'string' || !v.trim()) { bad(where + ': 글자 칸이 비었음'); return false; }
  if (max && v.length > max) bad(where + ': ' + max + '자 초과(' + v.length + ')'); return true; };
const SECTIONS = ['jobs', 'tech', 'money', 'world', 'campus', 'culture'];
const TAGS = ['모두의 화제', '한국에 직접', '생활에 바로', '의견 갈림', '파장 큼'];
const numBox = (n, w) => { if (only(n, ['value', 'caption', 'source'], w)) { str(n.value, w + ' value', 24); str(n.caption, w + ' caption', 60); str(n.source, w + ' source', 60); } };
if (only(d, ['edition', 'publishedAt', 'sourceCount', 'numbers', 'articles'], '판')) {
  if (!/^\d{4}-\d{2}-\d{2}-(am|pm)$/.test(d.edition)) bad('edition 꼴');
  if (typeof d.publishedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(d.publishedAt) || isNaN(Date.parse(d.publishedAt))) bad('publishedAt 은 시간대 붙은 ISO 시각');
  if (!Number.isInteger(d.sourceCount) || d.sourceCount < 1 || d.sourceCount > 999) bad('sourceCount 정수 1~999');
  if (!Array.isArray(d.numbers) || d.numbers.length > 6) bad('numbers 는 6칸 이하 배열');
  else d.numbers.forEach((n, i) => numBox(n, 'numbers' + (i + 1)));
  if (!Array.isArray(d.articles) || d.articles.length < 8 || d.articles.length > 40) bad('기사는 8~40편');
  else d.articles.forEach((a, i) => {
    const w = '기사' + (i + 1);
    if (!only(a, ['key', 'section', 'title', 'easyKo', 'paragraphs', 'keySentence', 'glosses', 'sources', 'quiz', 'job', 'talk'], w, ['tag', 'num', 'life', 'deep', 'story'])) return;
    if (a.key !== d.edition + '-' + (i + 1)) bad(w + ': key 는 ' + d.edition + '-' + (i + 1));
    if (!SECTIONS.includes(a.section)) bad(w + ': section');
    if ('tag' in a && !TAGS.includes(a.tag)) bad(w + ': tag');
    str(a.title, w + ' title', 120); str(a.easyKo, w + ' easyKo', 300); str(a.keySentence, w + ' keySentence', 300);
    let all = '', ok = false;
    if (!Array.isArray(a.paragraphs) || a.paragraphs.length < 2 || a.paragraphs.length > 8) bad(w + ': 문단 2~8개');
    else a.paragraphs.forEach((p, j) => { if (!only(p, ['en', 'ko', 'sents'], w + ' 문단' + (j + 1))) return;
      if (str(p.en, w + ' en', 900)) { all += ' ' + p.en; if (typeof a.keySentence === 'string' && p.en.includes(a.keySentence)) ok = true; }
      str(p.ko, w + ' ko', 600);
      if (!Array.isArray(p.sents) || p.sents.length < 1 || p.sents.length > 16) bad(w + ' 문단' + (j + 1) + ': sents 1~16개');
      else { p.sents.forEach((x, k) => { if (only(x, ['en', 'ko'], w + ' 문단' + (j + 1) + ' sent' + (k + 1))) { str(x.en, w + ' sent en', 400); str(x.ko, w + ' sent ko', 300); } });
        if (p.sents.map((x) => x && x.en).join(' ') !== p.en) bad(w + ' 문단' + (j + 1) + ': sents 의 en 을 한 칸 띄어 이은 것이 문단 en 과 다름'); } });
    const wc = (all.match(/[A-Za-z]+/g) || []).length;
    const max = a.deep ? 480 : 300;
    if (wc < 80 || wc > max) bad(w + ': 영어 낱말 수 ' + wc + ' (80~' + max + ')');
    if (!ok) bad(w + ': keySentence 가 본문 en 안에 없음');
    if (!Array.isArray(a.glosses) || a.glosses.length > 80) bad(w + ': glosses 80개 이하');
    else a.glosses.forEach((g, j) => { const gw = w + ' gloss' + (j + 1);
      if (!only(g, ['text', 'meaning', 'level'], gw)) return;
      if (str(g.text, gw + ' text', 40) && !all.toLowerCase().includes(g.text.toLowerCase())) bad(gw + ': text 가 본문에 없음 (' + g.text + ')');
      str(g.meaning, gw + ' meaning', 60);
      if (!Number.isInteger(g.level) || g.level < 0 || g.level > 4) bad(gw + ': level 0~4'); });
    if (!Array.isArray(a.sources) || a.sources.length < 1 || a.sources.length > 8) bad(w + ': sources 1~8개');
    else a.sources.forEach((s, j) => { const sw = w + ' source' + (j + 1);
      if (!only(s, ['name', 'url'], sw, ['title'])) return; str(s.name, sw + ' name', 60);
      if ('title' in s) str(s.title, sw + ' title', 160);
      if (typeof s.url !== 'string' || !/^https:\/\/\S+$/.test(s.url)) bad(sw + ': url 은 https 만'); });
    if (!Array.isArray(a.quiz) || a.quiz.length !== 3) bad(w + ': quiz 는 정확히 3문제');
    else a.quiz.forEach((x, j) => { const qw = w + ' quiz' + (j + 1);
      if (!only(x, ['q', 'qKo', 'choices', 'answer', 'why'], qw)) return;
      str(x.q, qw + ' q', 160); str(x.qKo, qw + ' qKo', 120); str(x.why, qw + ' why', 200);
      if (!Array.isArray(x.choices) || x.choices.length !== 3) bad(qw + ': choices 정확히 3개');
      else { x.choices.forEach((c, k) => str(c, qw + ' choice' + (k + 1), 120));
        if (new Set(x.choices.map((c) => String(c).trim().toLowerCase())).size !== 3) bad(qw + ': choices 가 서로 다르지 않음'); }
      if (!Number.isInteger(x.answer) || x.answer < 0 || x.answer > 2) bad(qw + ': answer 0~2'); });
    str(a.job, w + ' job', 160);
    if (only(a.talk, ['q', 'qKo', 'answer', 'answerKo', 'phrases'], w + ' talk')) {
      str(a.talk.q, w + ' talk q', 200); str(a.talk.qKo, w + ' talk qKo', 160); str(a.talk.answer, w + ' talk answer', 700); str(a.talk.answerKo, w + ' talk answerKo', 500);
      if (!Array.isArray(a.talk.phrases) || a.talk.phrases.length < 1 || a.talk.phrases.length > 3) bad(w + ': talk phrases 1~3개');
      else a.talk.phrases.forEach((ph, j) => { if (only(ph, ['en', 'ko'], w + ' phrase' + (j + 1))) { str(ph.en, w + ' phrase en', 60); str(ph.ko, w + ' phrase ko', 60); } }); }
    if ('story' in a && only(a.story, ['prev', 'n'], w + ' story')) {
      const m = typeof a.story.prev === 'string' && a.story.prev.match(/^(\d{4}-\d{2}-\d{2}-(?:am|pm))-(\d+)$/);
      if (!m) bad(w + ' story: prev 꼴');
      else {
        if (!(m[1] < d.edition)) bad(w + ' story: prev 판이 이번 판보다 앞이 아님');
        const pf = join(dirname(file), 'archive', m[1] + '.json');
        if (!existsSync(pf)) bad(w + ' story: archive/' + m[1] + '.json 없음');
        else { try { const pd = JSON.parse(readFileSync(pf, 'utf8')); const pa = (pd.articles || []).find((x) => x.key === a.story.prev);
          if (!pa) bad(w + ' story: prev 기사 없음');
          else { const want = pa.story && Number.isInteger(pa.story.n) ? pa.story.n + 1 : 2;
            if (a.story.n !== want) bad(w + ' story: n 은 ' + want); } } catch (e) { bad(w + ' story: archive 읽기 실패'); } }
      }
      if (!Number.isInteger(a.story.n) || a.story.n < 2 || a.story.n > 99) bad(w + ' story: n 2~99');
    }
    if ('num' in a) numBox(a.num, w + ' num');
    if ('life' in a) str(a.life, w + ' life', 200);
    if ('deep' in a && only(a.deep, ['why', 'next', 'keyNumbers', 'views'], w + ' deep')) {
      str(a.deep.why, w + ' why', 200); str(a.deep.next, w + ' next', 200); str(a.deep.keyNumbers, w + ' keyNumbers', 200);
      if (!Array.isArray(a.deep.views) || a.deep.views.length < 1 || a.deep.views.length > 5) bad(w + ': views 1~5줄');
      else a.deep.views.forEach((v, j) => { if (only(v, ['source', 'view'], w + ' view' + (j + 1))) { str(v.source, w + ' view source', 60); str(v.view, w + ' view', 160); } }); }
  });
}
const idx = join(dirname(file), 'index.json');
if (existsSync(idx)) {
  try { const x = JSON.parse(readFileSync(idx, 'utf8'));
    if (!Array.isArray(x) || x.length > 200) bad('index.json 은 200줄 이하 배열');
    else x.forEach((r, i) => { if (only(r, ['edition', 'publishedAt', 'lead'], 'index' + (i + 1))) { str(r.edition, 'index edition'); str(r.publishedAt, 'index publishedAt'); str(r.lead, 'index lead', 120); } });
  } catch (e) { bad('index.json 읽기 실패: ' + e.message); }
}
if (errs.length) { console.log(errs.join('\n')); process.exit(1); }
console.log('OK');
