// check-today-en v1
// 사용법: node scripts/check-today-en.mjs today-en/current.json — 통과면 OK · 아니면 틀린 곳 한 줄씩 + exit 1
// v1(2026-11-26): 캠퍼스친구 사이트 src/lib/today-english-news.ts(TodayEnglishNewsEditionSchema · todayEnglishNewsEditionProblems)와 같은 규칙 + 한국어 판(today/)과 열쇠 · 분야 · 사진 · 원래 기사 대조 · 일꾼은 고치지 않는다.
import { readFileSync, statSync, existsSync } from 'node:fs';
const errs = [];
const e = (m) => errs.push(m);
const path = process.argv[2] || 'today-en/current.json';
const load = (p, max) => { if (statSync(p).size > max) throw new Error(p + ' 파일이 ' + max + ' 바이트를 넘음'); return JSON.parse(readFileSync(p, 'utf8')); };
let d;
try { d = load(path, 1800000); } catch (x) { console.log('JSON 읽기 실패: ' + x.message); process.exit(1); }
const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
const only = (o, keys, where) => { if (!isObj(o)) { e(where + ': 객체가 아님'); return false; } for (const k of Object.keys(o)) if (!keys.includes(k)) e(where + ': 허용 안 되는 칸 ' + k); return true; };
const text = (v, max, where) => { if (typeof v !== 'string' || v.trim().length === 0) { e(where + ': 비었음'); return false; } if (v !== v.trim()) e(where + ': 앞뒤 빈칸'); if (v.trim().length > max) e(where + ': ' + max + '자 초과(' + v.trim().length + ')'); return true; };
const ISO = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$/;
const isoOk = (v) => { if (typeof v !== 'string' || !ISO.test(v) || isNaN(Date.parse(v))) return false; const [y, mo, da] = v.slice(0, 10).split('-').map(Number); const h = +v.slice(11, 13), mi = +v.slice(14, 16), se = +v.slice(17, 19); const dim = new Date(Date.UTC(y, mo, 0)).getUTCDate(); return mo >= 1 && mo <= 12 && da >= 1 && da <= dim && h <= 23 && mi <= 59 && se <= 59; };
const TOPICS = ['정치', '경제', '사회', '국제', 'IT·과학', '문화', '스포츠', '교육·대학', '일자리', '생활'];
const HANGUL = /[가-힣]/;
if (!isObj(d)) { console.log('최상위가 객체가 아님'); process.exit(1); }
only(d, ['edition', 'publishedAt', 'issues'], '파일');
if (typeof d.edition !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}-(am|pm)$/.test(d.edition)) { console.log('edition 꼴이 YYYY-MM-DD-am/pm 이 아님'); process.exit(1); }
if (!isoOk(d.publishedAt)) e('publishedAt 이 시간대 붙은 ISO 시각(초까지)이 아님');
// 한국어 판 = today/archive/<판>.json(없으면 today/current.json 의 판이 같을 때)
let ko = null;
for (const p of ['today/archive/' + d.edition + '.json', 'today/current.json']) {
  if (!existsSync(p)) continue;
  try { const k = load(p, 1800000); if (k && k.edition === d.edition) { ko = k; break; } } catch {}
}
if (!ko) e('한국어 판(today/archive/' + d.edition + '.json)을 찾지 못함');
if (!Array.isArray(d.issues) || d.issues.length < 3 || d.issues.length > 40) e('issues 는 3~40개여야 함');
else {
  if (ko && ko.issues.length !== d.issues.length) e('이슈 수가 한국어 판(' + ko.issues.length + ')과 다름 — 모든 이슈를 같은 차례로');
  d.issues.forEach((it, i) => {
    const w = 'issues[' + i + ']';
    if (!only(it, ['key', 'topic', 'title', 'titleKo', 'summary', 'why', 'paragraphs', 'glosses', 'photo', 'sources'], w)) return;
    if (it.key !== d.edition + '-' + (i + 1)) e(w + ': key 는 ' + d.edition + '-' + (i + 1) + ' 이어야 함');
    if (!TOPICS.includes(it.topic)) e(w + ': topic 은 열 분야 가운데 하나(글자 그대로)');
    const k = ko && ko.issues[i];
    if (k) {
      if (k.key !== it.key) e(w + ': key 가 한국어 판과 다름');
      if (k.topic !== it.topic) e(w + ': topic 이 한국어 판과 다름');
      if (JSON.stringify(k.photo ?? null) !== JSON.stringify(it.photo ?? null)) e(w + ': photo 가 한국어 판과 한 글자라도 다름(그대로 옮기거나 · 없으면 칸 없이)');
      if (JSON.stringify(k.sources) !== JSON.stringify(it.sources)) e(w + ': sources 가 한국어 판과 한 글자라도 다름(그대로 옮김)');
    }
    if (text(it.title, 160, w + '.title') && HANGUL.test(it.title)) e(w + '.title 에 한글');
    if ('titleKo' in it) text(it.titleKo, 200, w + '.titleKo');
    if (text(it.summary, 450, w + '.summary') && HANGUL.test(it.summary)) e(w + '.summary 에 한글');
    if (text(it.why, 320, w + '.why') && HANGUL.test(it.why)) e(w + '.why 에 한글');
    let body = '';
    if (!Array.isArray(it.paragraphs) || it.paragraphs.length < 2 || it.paragraphs.length > 8) e(w + '.paragraphs 2~8 문단');
    else it.paragraphs.forEach((p, j) => {
      const pw = w + '.paragraphs[' + j + ']';
      if (!only(p, ['en', 'ko', 'sents'], pw)) return;
      if (text(p.en, 4000, pw + '.en')) { if (HANGUL.test(p.en)) e(pw + '.en 에 한글'); body += p.en.toLowerCase() + '\n'; }
      text(p.ko, 4000, pw + '.ko');
      if (!Array.isArray(p.sents) || p.sents.length < 1 || p.sents.length > 40) e(pw + '.sents 1~40 문장');
      else {
        p.sents.forEach((s, n) => { const sw = pw + '.sents[' + n + ']'; if (!only(s, ['en', 'ko'], sw)) return; text(s.en, 800, sw + '.en'); text(s.ko, 800, sw + '.ko'); });
        if (p.sents.map((s) => s && s.en).join(' ') !== p.en) e(pw + ': sents 의 en 을 빈칸 하나로 이으면 문단 en 과 글자 그대로 같아야 함');
      }
    });
    if (!Array.isArray(it.glosses) || it.glosses.length > 80) e(w + '.glosses 0~80');
    else {
      const seen = new Set();
      it.glosses.forEach((g, n) => {
        const gw = w + '.glosses[' + n + ']';
        if (!only(g, ['text', 'meaning', 'level'], gw)) return;
        if (text(g.text, 40, gw + '.text')) {
          const t = g.text.toLowerCase();
          if (seen.has(t)) e(gw + ': 같은 낱말 두 번'); seen.add(t);
          if (!body.includes(t)) e(gw + ': 「' + g.text + '」이 이 이슈 영어 문단(en)에 없음');
        }
        text(g.meaning, 60, gw + '.meaning');
        if (!Number.isInteger(g.level) || g.level < 0 || g.level > 4) e(gw + '.level 은 0~4 정수');
      });
    }
    if (!Array.isArray(it.sources) || it.sources.length < 1 || it.sources.length > 12) e(w + '.sources 1~12');
  });
}
if (errs.length) { console.log(errs.join(String.fromCharCode(10))); process.exit(1); }
console.log('OK');
