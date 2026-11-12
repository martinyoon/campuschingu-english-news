// check-hot v1
import { readFileSync } from 'node:fs';
const errs = [];
const e = (m) => errs.push(m);
let d;
try { d = JSON.parse(readFileSync(process.argv[2] || 'editions/hot.json', 'utf8')); } catch (x) { console.log('JSON 읽기 실패: ' + x.message); process.exit(1); }
const only = (o, keys, where) => { for (const k of Object.keys(o)) if (!keys.includes(k)) e(`${where}: 허용 안 되는 칸 ${k}`); };
const str = (v) => typeof v === 'string' && v.trim().length > 0;
if (!d || typeof d !== 'object' || Array.isArray(d)) { console.log('최상위가 객체가 아님'); process.exit(1); }
only(d, ['edition', 'publishedAt', 'items'], '파일');
if (!str(d.edition) || !/^\d{4}-\d{2}-\d{2}-(am|pm)$/.test(d.edition)) e('edition 꼴이 YYYY-MM-DD-am/pm 이 아님');
if (!str(d.publishedAt) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(d.publishedAt) || isNaN(Date.parse(d.publishedAt))) e('publishedAt 이 시간대 붙은 ISO 시각이 아님');
if (!Array.isArray(d.items) || d.items.length < 10 || d.items.length > 300) e('items 는 10~300줄이어야 함');
else {
  const urls = new Set();
  d.items.forEach((it, i) => {
    const w = `items[${i}]`;
    if (!it || typeof it !== 'object') return e(w + ': 객체가 아님');
    only(it, ['key', 'kind', 'title', 'ko', 'source', 'score', 'comments'], w);
    if (it.key !== `${d.edition}-h${i + 1}`) e(`${w}: key 는 ${d.edition}-h${i + 1} 이어야 함`);
    if (it.kind !== 'talk' && it.kind !== 'star') e(w + ': kind 는 talk 또는 star');
    if (!str(it.title)) e(w + ': title 이 비었음'); else if (it.title.length > 160) e(w + ': title 160자 초과');
    if (!str(it.ko)) e(w + ': ko 가 비었음'); else if (it.ko.length > 160) e(w + ': ko 160자 초과');
    const s = it.source;
    if (!s || typeof s !== 'object') e(w + ': source 없음');
    else {
      only(s, ['name', 'url'], w + '.source');
      if (!str(s.name)) e(w + ': source.name 비었음'); else if (s.name.length > 60) e(w + ': source.name 60자 초과');
      if (!str(s.url) || !/^https:\/\//.test(s.url)) e(w + ': source.url 은 https 만');
      else {
        if (/reddit\.com/i.test(s.url)) e(w + ': url 에 reddit.com');
        if (urls.has(s.url)) e(w + ': url 겹침'); urls.add(s.url);
      }
    }
    for (const k of ['score', 'comments']) if (k in it && !(Number.isInteger(it[k]) && it[k] >= 0)) e(`${w}: ${k} 는 0 이상 정수`);
  });
}
if (errs.length) { console.log(errs.join('\n')); process.exit(1); }
console.log('OK');
