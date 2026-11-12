// check-bites v1
import fs from 'node:fs';
const FIELDS = `job-hunt intern startup invest housing marketing accounting trade office ai coding chips robots gamedev security gadgets data bigtech cars battery architecture materials aviation energy transport industrial-design manufacturing space physics chemistry biology climate math ocean fossils animals medicine nursing pharma brain mind fitness nutrition sleep public-health global law usa europe rights green-policy media population safety history philosophy books language art classical design religion archaeology movies drama kpop pop-music games anime creators fashion celebs soccer baseball basketball esports travel food pets relationships living campus-life study-abroad tuition grad-school funding research-ethics higher-ed academic-jobs`.split(' ');
const errs = [];
const e = (m) => errs.push(m);
let d;
try { d = JSON.parse(fs.readFileSync(process.argv[2] || 'editions/bites.json', 'utf8')); } catch (x) { console.log('JSON 읽기 실패: ' + x.message); process.exit(1); }
const only = (o, keys, where) => { for (const k of Object.keys(o)) if (!keys.includes(k)) e(`${where}: 모르는 칸 ${k}`); };
const str = (v, max, where) => { if (typeof v !== 'string' || !v.trim()) return e(`${where}: 비었거나 글자가 아님`), false; if (v.length > max) e(`${where}: ${max}자 넘음`); return true; };
const ED = /^(\d{4}-\d{2}-\d{2})-(am|pm)$/;
only(d, ['edition', 'publishedAt', 'bites'], '파일');
const m = ED.exec(d.edition || '');
if (!m) e('edition 꼴 틀림');
if (typeof d.publishedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(d.publishedAt) || isNaN(Date.parse(d.publishedAt))) e('publishedAt 틀림');
if (!Array.isArray(d.bites) || d.bites.length < 20 || d.bites.length > 300) e('bites 20 ~ 300줄 아님');
else {
  const keys = new Set(), urls = new Set(), cnt = {};
  d.bites.forEach((b, i) => {
    const w = `줄${i + 1}`;
    only(b, ['key', 'field', 'title', 'en', 'ko', 'gloss', 'source'], w);
    const km = /^(\d{4}-\d{2}-\d{2})-(am|pm)-b\d{1,3}$/.exec(b.key || '');
    if (!km) e(`${w}: key 꼴 틀림`);
    else {
      if (keys.has(b.key)) e(`${w}: key 겹침`); keys.add(b.key);
      if (m && (Date.parse(m[1]) - Date.parse(km[1])) / 864e5 > 6) e(`${w}: key 날짜가 6일 넘게 앞`);
    }
    if (!FIELDS.includes(b.field)) e(`${w}: field 틀림`); else { cnt[b.field] = (cnt[b.field] || 0) + 1; if (cnt[b.field] > 3) e(`${w}: 한 field 3줄 넘음`); }
    str(b.title, 120, w + ' title'); str(b.en, 420, w + ' en'); str(b.ko, 160, w + ' ko');
    if (b.gloss !== undefined) {
      const g = b.gloss;
      if (!g || typeof g !== 'object') e(w + ' gloss 틀림'); else {
        only(g, ['text', 'meaning', 'level'], w + ' gloss');
        str(g.text, 40, w + ' gloss.text'); str(g.meaning, 60, w + ' gloss.meaning');
        if (!Number.isInteger(g.level) || g.level < 0 || g.level > 4) e(w + ' gloss.level 틀림');
        if (typeof g.text === 'string' && typeof b.en === 'string' && !b.en.toLowerCase().includes(g.text.toLowerCase())) e(w + ' gloss.text 가 en 안에 없음');
      }
    }
    const s = b.source;
    if (!s || typeof s !== 'object') e(w + ' source 틀림'); else {
      only(s, ['name', 'url'], w + ' source'); str(s.name, 60, w + ' source.name');
      if (typeof s.url !== 'string' || !/^https:\/\/\S+$/.test(s.url)) e(w + ' source.url https 아님');
      else { if (urls.has(s.url)) e(w + ' url 겹침'); urls.add(s.url); }
    }
  });
}
if (errs.length) { console.log(errs.join('\n')); process.exit(1); }
console.log('OK');
