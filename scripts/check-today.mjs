// check-today v1
// 사용법: node scripts/check-today.mjs today/current.json — 통과면 OK · 아니면 틀린 곳 한 줄씩 + exit 1
// v1(2026-11-26): 캠퍼스친구 사이트 src/lib/today-news.ts(TodayNewsEditionSchema · todayNewsEditionProblems)와 같은 규칙 · 일꾼은 고치지 않는다.
import { readFileSync, statSync } from 'node:fs';
const errs = [];
const e = (m) => errs.push(m);
const path = process.argv[2] || 'today/current.json';
let d;
try { if (statSync(path).size > 1800000) { console.log('파일이 1,800,000 바이트를 넘음'); process.exit(1); } d = JSON.parse(readFileSync(path, 'utf8')); } catch (x) { console.log('JSON 읽기 실패: ' + x.message); process.exit(1); }
const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
const only = (o, keys, where) => { if (!isObj(o)) { e(where + ': 객체가 아님'); return false; } for (const k of Object.keys(o)) if (!keys.includes(k)) e(where + ': 허용 안 되는 칸 ' + k); return true; };
const text = (v, max, where) => { if (typeof v !== 'string' || v.trim().length === 0) e(where + ': 비었음'); else if (v.trim().length > max) e(where + ': ' + max + '자 초과(' + v.trim().length + ')'); };
const ISO = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$/;
const isoOk = (v) => typeof v === 'string' && ISO.test(v) && !isNaN(Date.parse(v));
const host = (u, hosts) => { try { const x = new URL(u.trim()); return x.protocol === 'https:' && (hosts === null || hosts.includes(x.hostname)) && u.trim().length <= 800; } catch { return false; } };
const TOPICS = ['정치', '경제', '사회', '국제', 'IT·과학', '문화', '스포츠', '교육·대학', '일자리', '생활'];
const LICENSE = /^(퍼블릭 도메인|CC0( 1\.0)?|CC BY(-SA)? [1-4]\.0)$/;
if (!isObj(d)) { console.log('최상위가 객체가 아님'); process.exit(1); }
only(d, ['edition', 'publishedAt', 'issues'], '파일');
if (typeof d.edition !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}-(am|pm)$/.test(d.edition)) e('edition 꼴이 YYYY-MM-DD-am/pm 이 아님');
if (!isoOk(d.publishedAt)) e('publishedAt 이 시간대 붙은 ISO 시각(초까지)이 아님');
if (!Array.isArray(d.issues) || d.issues.length < 3 || d.issues.length > 40) e('issues 는 3~40개여야 함');
else {
  const photos = new Set();
  d.issues.forEach((it, i) => {
    const w = 'issues[' + i + ']';
    if (!only(it, ['key', 'topic', 'title', 'summary', 'why', 'paragraphs', 'photo', 'sources'], w)) return;
    if (it.key !== d.edition + '-' + (i + 1)) e(w + ': key 는 ' + d.edition + '-' + (i + 1) + ' 이어야 함');
    if (!TOPICS.includes(it.topic)) e(w + ': topic 은 열 분야 가운데 하나(글자 그대로)');
    text(it.title, 80, w + '.title');
    text(it.summary, 220, w + '.summary');
    text(it.why, 140, w + '.why');
    if (!Array.isArray(it.paragraphs) || it.paragraphs.length < 2 || it.paragraphs.length > 8) e(w + '.paragraphs 2~8 문단');
    else it.paragraphs.forEach((p, j) => text(p, 800, w + '.paragraphs[' + j + ']'));
    if ('photo' in it) {
      const p = it.photo;
      if (only(p, ['src', 'page', 'author', 'license'], w + '.photo')) {
        if (typeof p.src !== 'string' || !host(p.src, ['upload.wikimedia.org', 'thumb.wikimedia.org'])) e(w + '.photo.src 는 https://thumb.wikimedia.org/ · https://upload.wikimedia.org/ 주소만');
        else { if (photos.has(p.src)) e(w + '.photo.src 같은 사진 두 번'); photos.add(p.src); }
        if (typeof p.page !== 'string' || !host(p.page, ['commons.wikimedia.org'])) e(w + '.photo.page 는 https://commons.wikimedia.org/ 주소만');
        text(p.author, 80, w + '.photo.author');
        if (typeof p.license !== 'string' || !LICENSE.test(p.license.trim())) e(w + '.photo.license 는 퍼블릭 도메인 · CC0 · CC BY x.0 · CC BY-SA x.0 만');
      }
    }
    if (!Array.isArray(it.sources) || it.sources.length < 1 || it.sources.length > 12) e(w + '.sources 1~12');
    else {
      const urls = new Set();
      it.sources.forEach((s, k) => {
        const sw = w + '.sources[' + k + ']';
        if (!only(s, ['name', 'title', 'url', 'publishedAt'], sw)) return;
        text(s.name, 30, sw + '.name');
        text(s.title, 200, sw + '.title');
        if (typeof s.url !== 'string' || !host(s.url, null)) e(sw + '.url 은 https 주소만(800자 안)');
        else { if (urls.has(s.url)) e(sw + '.url 같은 원래 기사 두 번'); urls.add(s.url); }
        if ('publishedAt' in s && !isoOk(s.publishedAt)) e(sw + '.publishedAt 이 시간대 붙은 ISO 시각(초까지)이 아님');
      });
    }
  });
}
if (errs.length) { console.log(errs.join(String.fromCharCode(10))); process.exit(1); }
console.log('OK');
