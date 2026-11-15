// check-hot v2
// 사용법: node scripts/check-hot.mjs editions/hot.json — 통과면 OK · 아니면 틀린 곳 한 줄씩 + exit 1
// v2(2026-11-15): 줄마다 paragraphs(원문 수준 영어 · 문단 한국어 · 문장마다 영어 · 한국어) + glosses 필수 · 캠퍼스친구 사이트 HotSchema 와 같은 규칙 · 일꾼은 고치지 않는다.
import { readFileSync } from 'node:fs';
const errs = [];
const e = (m) => errs.push(m);
let d;
try { d = JSON.parse(readFileSync(process.argv[2] || 'editions/hot.json', 'utf8')); } catch (x) { console.log('JSON 읽기 실패: ' + x.message); process.exit(1); }
const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
const only = (o, keys, where) => { if (!isObj(o)) { e(where + ': 객체가 아님'); return false; } for (const k of Object.keys(o)) if (!keys.includes(k)) e(where + ': 허용 안 되는 칸 ' + k); return true; };
const str = (v) => typeof v === 'string' && v.trim().length > 0;
const text = (v, max, where) => { if (!str(v)) e(where + ': 비었음'); else if (v.length > max) e(where + ': ' + max + '자 초과(' + v.length + ')'); };
const words = (s) => (s.match(/[A-Za-z0-9]+/g) || []);
const ISO = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$/;
if (!isObj(d)) { console.log('최상위가 객체가 아님'); process.exit(1); }
only(d, ['edition', 'publishedAt', 'items'], '파일');
if (!str(d.edition) || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}-(am|pm)$/.test(d.edition)) e('edition 꼴이 YYYY-MM-DD-am/pm 이 아님');
if (!str(d.publishedAt) || !ISO.test(d.publishedAt) || isNaN(Date.parse(d.publishedAt))) e('publishedAt 이 시간대 붙은 ISO 시각이 아님');
if (!Array.isArray(d.items) || d.items.length < 10 || d.items.length > 300) e('items 는 10~300줄이어야 함');
else {
  const urls = new Set();
  d.items.forEach((it, i) => {
    const w = 'items[' + i + ']';
    if (!only(it, ['key', 'kind', 'title', 'ko', 'source', 'score', 'comments', 'paragraphs', 'glosses'], w)) return;
    if (it.key !== d.edition + '-h' + (i + 1)) e(w + ': key 는 ' + d.edition + '-h' + (i + 1) + ' 이어야 함');
    if (it.kind !== 'talk' && it.kind !== 'star') e(w + ': kind 는 talk 또는 star');
    text(it.title, 160, w + '.title');
    text(it.ko, 160, w + '.ko');
    const s = it.source;
    if (only(s, ['name', 'url'], w + '.source')) {
      text(s.name, 60, w + '.source.name');
      if (!str(s.url) || !s.url.startsWith('https://')) e(w + ': source.url 은 https 만');
      else {
        if (s.url.toLowerCase().includes('reddit.com')) e(w + ': url 에 reddit.com');
        if (urls.has(s.url)) e(w + ': url 겹침');
        urls.add(s.url);
      }
    }
    for (const k of ['score', 'comments']) if (k in it && !(Number.isInteger(it[k]) && it[k] >= 0)) e(w + ': ' + k + ' 는 0 이상 정수');
    let story = '';
    if (!Array.isArray(it.paragraphs) || it.paragraphs.length < 1 || it.paragraphs.length > 60) e(w + '.paragraphs 1~60 문단');
    else it.paragraphs.forEach((p, j) => {
      const pw = w + '.paragraphs[' + j + ']';
      if (!only(p, ['en', 'ko', 'sents'], pw)) return;
      text(p.en, 4000, pw + '.en');
      text(p.ko, 4000, pw + '.ko');
      if (typeof p.en === 'string') story += p.en + ' ';
      if (!Array.isArray(p.sents) || p.sents.length < 1 || p.sents.length > 40) { e(pw + '.sents 1~40'); return; }
      p.sents.forEach((x, k) => { if (only(x, ['en', 'ko'], pw + '.sents[' + k + ']')) { text(x.en, 800, pw + '.sents[' + k + '].en'); text(x.ko, 800, pw + '.sents[' + k + '].ko'); } });
      if (p.sents.map((x) => x.en).join(' ') !== p.en) e(pw + ': sents 의 en 을 빈칸 한 칸으로 이으면 문단 en 과 글자 그대로 같아야 함');
    });
    const wc = words(story).length;
    if (wc < 120 || wc > 8000) e(w + ': 영어 글 낱말 ' + wc + ' (120~8000)');
    if (!Array.isArray(it.glosses) || it.glosses.length > 300) e(w + '.glosses 0~300');
    else {
      const sl = story.toLowerCase();
      it.glosses.forEach((g, k) => {
        const gw = w + '.glosses[' + k + ']';
        if (!only(g, ['text', 'meaning', 'level'], gw)) return;
        text(g.text, 40, gw + '.text');
        text(g.meaning, 60, gw + '.meaning');
        if (!Number.isInteger(g.level) || g.level < 0 || g.level > 4) e(gw + '.level 0~4 정수');
        if (str(g.text) && !sl.includes(g.text.toLowerCase())) e(gw + ' 「' + g.text + '」 이 영어 글에 없음');
      });
    }
  });
}
if (errs.length) { console.log(errs.join(String.fromCharCode(10))); process.exit(1); }
console.log('OK');
