// 캠퍼스친구 「나의 영어신문」 판 파일 검사 · 사용법: node scripts/check-edition.mjs editions/current.json
import { readFileSync } from 'node:fs';
const errs = [];
const bad = (m) => errs.push(m);
let d;
try { d = JSON.parse(readFileSync(process.argv[2] ?? 'editions/current.json', 'utf8')); }
catch (e) { console.log('JSON을 읽을 수 없음: ' + e.message); process.exit(1); }
const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
const only = (o, keys, where) => { if (!isObj(o)) { bad(where + ': 객체가 아님'); return false; }
  for (const k of Object.keys(o)) if (!keys.includes(k)) bad(where + ': 모르는 칸 ' + k);
  for (const k of keys) if (!(k in o)) bad(where + ': 칸 없음 ' + k); return true; };
const str = (v, where, max) => { if (typeof v !== 'string' || !v.trim()) { bad(where + ': 글자 칸이 비었음'); return false; }
  if (max && v.length > max) bad(where + ': ' + max + '자 초과(' + v.length + ')'); return true; };
const SECTIONS = ['world', 'money', 'tech', 'science', 'culture', 'campus'];
if (only(d, ['edition', 'publishedAt', 'sourceCount', 'articles'], '판')) {
  if (!/^\d{4}-\d{2}-\d{2}-(am|pm)$/.test(d.edition)) bad('edition 꼴');
  if (typeof d.publishedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(d.publishedAt) || isNaN(Date.parse(d.publishedAt))) bad('publishedAt 은 시간대 붙은 ISO 시각');
  if (!Number.isInteger(d.sourceCount) || d.sourceCount < 1 || d.sourceCount > 999) bad('sourceCount 정수 1~999');
  if (!Array.isArray(d.articles) || d.articles.length !== 8) bad('기사는 정확히 8편');
  else d.articles.forEach((a, i) => {
    const w = '기사' + (i + 1);
    if (!only(a, ['key', 'section', 'title', 'easyKo', 'paragraphs', 'keySentence', 'glosses', 'sources'], w)) return;
    if (a.key !== d.edition + '-' + (i + 1)) bad(w + ': key 는 ' + d.edition + '-' + (i + 1));
    if (!SECTIONS.includes(a.section)) bad(w + ': section');
    str(a.title, w + ' title', 120); str(a.easyKo, w + ' easyKo', 300); str(a.keySentence, w + ' keySentence', 300);
    let all = '', ok = false;
    if (!Array.isArray(a.paragraphs) || a.paragraphs.length < 2 || a.paragraphs.length > 6) bad(w + ': 문단 2~6개');
    else a.paragraphs.forEach((p, j) => { if (!only(p, ['en', 'ko'], w + ' 문단' + (j + 1))) return;
      if (str(p.en, w + ' en', 900)) { all += ' ' + p.en; if (typeof a.keySentence === 'string' && p.en.includes(a.keySentence)) ok = true; }
      str(p.ko, w + ' ko', 600); });
    const wc = (all.match(/[A-Za-z]+/g) || []).length;
    if (wc < 80 || wc > 260) bad(w + ': 영어 낱말 수 ' + wc + ' (80~260)');
    if (!ok) bad(w + ': keySentence 가 본문 en 안에 없음');
    if (!Array.isArray(a.glosses) || a.glosses.length > 80) bad(w + ': glosses 80개 이하');
    else a.glosses.forEach((g, j) => { const gw = w + ' gloss' + (j + 1);
      if (!only(g, ['text', 'meaning', 'level'], gw)) return;
      if (str(g.text, gw + ' text', 40) && !all.toLowerCase().includes(g.text.toLowerCase())) bad(gw + ': text 가 본문에 없음 (' + g.text + ')');
      str(g.meaning, gw + ' meaning', 60);
      if (!Number.isInteger(g.level) || g.level < 0 || g.level > 4) bad(gw + ': level 0~4'); });
    if (!Array.isArray(a.sources) || a.sources.length < 1 || a.sources.length > 5) bad(w + ': sources 1~5개');
    else a.sources.forEach((s, j) => { const sw = w + ' source' + (j + 1);
      if (!only(s, ['name', 'url'], sw)) return; str(s.name, sw + ' name', 60);
      if (typeof s.url !== 'string' || !/^https:\/\/\S+$/.test(s.url)) bad(sw + ': url 은 https 만'); });
  });
}
if (errs.length) { console.log(errs.join('\n')); process.exit(1); }
console.log('OK');
