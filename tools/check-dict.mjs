// check-dict v1 — 캠퍼스친구 「나의 영어신문」 뜻 사전 꼴 검사(2026-11-07 · 사이트가 넣어 둔 도구 · 일꾼은 돌리기만 하고 고치지 않는다)
// 사용법: node tools/check-dict.mjs dict/words.json · 통과면 OK · 아니면 틀린 곳 한 줄씩 + exit 1
// 사이트 검사와 같은 꼴: 낱말 = 소문자 하나(a-z 와 ' · 붙임표 없음) · meaning = 비지 않은 글자 60자 이하 · level = 정수 0 ~ 4 · added = 판 이름 · 다른 칸 없음.
// 더하기만: 마지막 커밋(HEAD)에 있던 줄은 글자 하나 바뀌거나 빠지면 안 된다(관리자가 사이트에서 고친 뜻을 지키려고 · 일꾼은 있는 줄을 고치지 않는다).
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const file = process.argv[2] ?? 'dict/words.json';
const errs = [];
const bad = (m) => errs.push(m);
let d;
try { d = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { console.log('JSON을 읽을 수 없음: ' + e.message); process.exit(1); }
if (!d || typeof d !== 'object' || Array.isArray(d)) { console.log('사전은 { 낱말: { meaning, level, added } } 꼴의 객체여야 함'); process.exit(1); }
const WORD_RE = /^[a-z][a-z']{0,39}$/;
const EDITION_RE = /^\d{4}-\d{2}-\d{2}-(am|pm)$/;
for (const [w, v] of Object.entries(d)) {
  if (!WORD_RE.test(w)) bad(`${w}: 낱말은 소문자 하나(a-z 와 ' · 붙임표 없음) · 40자 이하`);
  if (!v || typeof v !== 'object' || Array.isArray(v)) { bad(`${w}: 값이 객체가 아님`); continue; }
  for (const k of Object.keys(v)) if (!['meaning', 'level', 'added'].includes(k)) bad(`${w}: 모르는 칸 ${k}`);
  if (typeof v.meaning !== 'string' || !v.meaning.trim()) bad(`${w}: meaning 이 비었음`);
  else if (v.meaning.trim().length > 60) bad(`${w}: meaning 60자 초과(${v.meaning.trim().length})`);
  if (!Number.isInteger(v.level) || v.level < 0 || v.level > 4) bad(`${w}: level 은 정수 0 ~ 4`);
  if (typeof v.added !== 'string' || !EDITION_RE.test(v.added)) bad(`${w}: added 는 판 이름(YYYY-MM-DD-am|pm)`);
}
let before = null;
try { before = JSON.parse(execFileSync('git', ['show', `HEAD:${file}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })); } catch { before = null; }
if (before && typeof before === 'object') {
  for (const [w, v] of Object.entries(before)) {
    if (!Object.hasOwn(d, w)) bad(`${w}: 있던 줄이 빠졌음(지우지 않는다)`);
    else if (JSON.stringify(d[w]) !== JSON.stringify(v)) bad(`${w}: 있던 줄이 바뀌었음(고치지 않는다 · 원래 ${JSON.stringify(v)})`);
  }
}
if (errs.length) { for (const e of errs.slice(0, 80)) console.log(e); if (errs.length > 80) console.log(`… 외 ${errs.length - 80}곳`); process.exit(1); }
console.log(`OK · 낱말 ${Object.keys(d).length}개${before ? ` · 새로 더함 ${Object.keys(d).length - Object.keys(before).length}개` : ''}`);
