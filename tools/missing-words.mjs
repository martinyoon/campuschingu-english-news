// missing-words v3 — 캠퍼스친구 「나의 영어신문」 빠진 낱말 찾기(2026-11-07 · 사이트가 넣어 둔 도구 · 일꾼은 돌리기만 하고 고치지 않는다)
// 사용법: node tools/missing-words.mjs issues/current.json (옛 기사판 = editions/current.json)
// 판(제목 + 문단 영어)의 낱말 가운데 사이트 낱말 사전(tools/lexicon.txt = 영단어장 카드)에도 뜻 사전(dict/words.json)에도 없는 낱말을 찍는다.
// 낱말 자르기 · 원형 맞추기 = 사이트 규칙(src/lib/world-english-words.ts)을 옮김 — 단 «꼴 바뀜»(-s · -es · -ies · -ed · -d · -ing · 불규칙 · 기능어 꼴)만 「있음」으로 친다.
//   «다른 낱말 만들기»(-er · -est · -ly)는 「없음」으로 쳐서 teacher(≠ teach) · quietly(≠ quiet) 도 사전에 들어가게 한다(사이트는 사전에 꼴 그대로 있는 낱말을 먼저 본다).
// 찍는 줄 = 낱말 <TAB> 나온 횟수 <TAB> 처음 나온 문장 · 많이 나온 것부터 LIMIT 개까지.
import { readFileSync } from 'node:fs';
const LIMIT = 300;
const file = process.argv[2] ?? 'editions/current.json';
const LEX = new Set(readFileSync(new URL('./lexicon.txt', import.meta.url), 'utf8').split('\n').filter(Boolean).map((l) => l.split('\t')[0]));
let DICT = {};
try { DICT = JSON.parse(readFileSync(new URL('../dict/words.json', import.meta.url), 'utf8')); } catch { DICT = {}; }
const has = (w) => LEX.has(w) || Object.hasOwn(DICT, w);
const FUNCTION_FORMS = {
  am: "be", is: "be", are: "be", was: "be", were: "be", been: "be", being: "be",
  does: "do", did: "do", done: "do", doing: "do",
  has: "have", had: "have", having: "have",
  an: "a",
  me: "i", my: "i", mine: "i", myself: "i",
  her: "she", hers: "she", herself: "she",
  him: "he", his: "he", himself: "he",
  its: "it", itself: "it",
  them: "they", their: "they", theirs: "they", themselves: "they",
  us: "we", our: "we", ours: "we", ourselves: "we",
  your: "you", yours: "you", yourself: "you",
  these: "this", those: "that",
  // 합친 말 · 비교 꼴(목록엔 앞 낱말만 · 2026-10-17 잰 것: someone · anything · more · most 가 목록에 없음)
  someone: "some", somebody: "some", something: "some", anyone: "any", anybody: "any", anything: "any",
  everyone: "every", everybody: "every", everything: "every", nobody: "no", more: "much", most: "much",
};
const IRREGULAR = {
  said: "say", went: "go", gone: "go", came: "come", took: "take", taken: "take", made: "make", saw: "see", seen: "see", got: "get", gotten: "get",
  gave: "give", given: "give", found: "find", thought: "think", told: "tell", became: "become", left: "leave", felt: "feel", brought: "bring",
  began: "begin", begun: "begin", kept: "keep", held: "hold", wrote: "write", written: "write", stood: "stand", heard: "hear", meant: "mean",
  met: "meet", ran: "run", paid: "pay", sat: "sit", spoke: "speak", spoken: "speak", led: "lead", grew: "grow", grown: "grow", lost: "lose",
  fell: "fall", fallen: "fall", sent: "send", built: "build", understood: "understand", drew: "draw", drawn: "draw", broke: "break", broken: "break",
  spent: "spend", rose: "rise", risen: "rise", drove: "drive", driven: "drive", bought: "buy", wore: "wear", worn: "wear", chose: "choose", chosen: "choose",
  sought: "seek", threw: "throw", thrown: "throw", caught: "catch", dealt: "deal", won: "win", forgot: "forget", forgotten: "forget", slept: "sleep",
  ate: "eat", eaten: "eat", drank: "drink", drunk: "drink", sang: "sing", sung: "sing", swam: "swim", flew: "fly", flown: "fly", knew: "know", known: "know",
  taught: "teach", fought: "fight", hid: "hide", hidden: "hide", hung: "hang", shook: "shake", shaken: "shake", shot: "shoot", slid: "slide",
  stole: "steal", stolen: "steal", struck: "strike", swore: "swear", woke: "wake", woken: "wake", lit: "light", fed: "feed",
  fled: "flee", bent: "bend", lent: "lend", sold: "sell", stuck: "stick", spun: "spin", froze: "freeze", frozen: "freeze",
  bound: "bind", blew: "blow", blown: "blow", dug: "dig", forgave: "forgive", forgiven: "forgive", rode: "ride", ridden: "ride", shone: "shine",
  sank: "sink", sunk: "sink", strove: "strive", swung: "swing", wept: "weep", withdrew: "withdraw", withdrawn: "withdraw",
  arose: "arise", arisen: "arise", awoke: "awake", bore: "bear", borne: "bear", bled: "bleed", bred: "breed", clung: "cling", crept: "creep",
  knelt: "kneel", leapt: "leap", undertook: "undertake", undertaken: "undertake", mistook: "mistake",
  mistaken: "mistake", shrank: "shrink", shrunk: "shrink", stung: "sting", strode: "stride", swept: "sweep",
  rewrote: "rewrite", rewritten: "rewrite", overcame: "overcome",
  children: "child", men: "man", women: "woman", feet: "foot", teeth: "tooth", mice: "mouse", geese: "goose", knives: "knife",
  wives: "wife", leaves: "leaf", halves: "half", shelves: "shelf", wolves: "wolf", thieves: "thief", selves: "self", analyses: "analysis",
  hypotheses: "hypothesis", theses: "thesis", criteria: "criterion", phenomena: "phenomenon",
  better: "good", best: "good", worse: "bad", worst: "bad", less: "little", least: "little", further: "far", farther: "far",
};
const NO_LEMMA = new Set(['sometimes', 'tired', 'cooker']);
const CLITICS = new Set(["'s", "'re", "'m", "'ve", "'ll", "'d"]);
const NOT_BODY = { ca: 'can', wo: 'will', sha: 'shall' };
const WORD_RE = /[A-Za-z]+(?:['’][A-Za-z]+)*/g;
function firstPart(raw) {
  const w = raw.replace(/’/g, "'").toLowerCase();
  if (w.endsWith("n't")) { const body = w.slice(0, -3); return NOT_BODY[body] ?? body; }
  const m = w.match(/^(.+?)('s|'re|'m|'ve|'ll|'d)$/);
  return m ? m[1] : w;
}
const VOWELS = 'aeiou';
function endsCvc(stem) {
  const n = stem.length; if (n < 3) return false;
  const [a, b, c] = [stem[n - 3], stem[n - 2], stem[n - 1]];
  return !VOWELS.includes(a) && VOWELS.includes(b) && !VOWELS.includes(c) && !'wxy'.includes(c);
}
/** 꼴 바뀜만으로 원형에 닿나(사이트 worldEnglishLemma 에서 -er · -est · -ly 줄을 뺀 것). */
function found(w) {
  if (has(w)) return true;
  const fn = FUNCTION_FORMS[w]; if (fn && has(fn)) return true;
  const irr = IRREGULAR[w]; if (irr && has(irr)) return true;
  const tries = []; const add = (c) => c.length >= 2 && tries.push(c);
  const addStem = (stem) => {
    if (stem.length >= 3 && stem[stem.length - 1] === stem[stem.length - 2]) { add(stem); add(stem.slice(0, -1)); add(stem + 'e'); }
    else if (endsCvc(stem)) { add(stem + 'e'); add(stem); }
    else { add(stem); add(stem + 'e'); }
  };
  if (w.endsWith('ies')) add(w.slice(0, -3) + 'y');
  if (w.endsWith('s') && !w.endsWith('ss')) add(w.slice(0, -1));
  if (w.endsWith('es')) add(w.slice(0, -2));
  if (w.endsWith('ied')) add(w.slice(0, -3) + 'y');
  if (w.endsWith('ed')) addStem(w.slice(0, -2));
  if (w.endsWith('d')) add(w.slice(0, -1));
  if (w.endsWith('ing')) { const stem = w.slice(0, -3); addStem(stem); if (stem.endsWith('y')) add(stem.slice(0, -1) + 'ie'); }
  return tries.some(has);
}
let d;
try { d = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { console.log('판을 읽을 수 없음: ' + e.message); process.exit(1); }
const count = new Map(); const where = new Map();
for (const a of [...(d.articles ?? []), ...(d.issues ?? [])]) { // 이슈판(2026-11-13 · issues/current.json) = issues · 옛 기사판 = articles
  for (const text of [a.title ?? '', ...(a.paragraphs ?? []).map((p) => p.en ?? ''), ...(a.pro ?? []).map((p) => p.en ?? '')]) { // v3(2026-11-13 밤) = 원문 수준 이야기(pro)도
    for (const sentence of text.split(/(?<=[.!?])\s+/)) {
      for (const m of sentence.matchAll(WORD_RE)) {
        const raw = m[0];
        if (CLITICS.has(raw.toLowerCase())) continue;
        const w = firstPart(raw);
        if (w.length < 2 || NO_LEMMA.has(w) || !/^[a-z][a-z']*$/.test(w)) continue;
        if (found(w)) continue;
        count.set(w, (count.get(w) ?? 0) + 1);
        if (!where.has(w)) where.set(w, sentence.trim().slice(0, 160));
      }
    }
  }
}
const all = [...count.entries()].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1));
const now = all.slice(0, LIMIT);
console.log(`빠진 낱말 ${all.length}개 · 이번에 적을 것 ${now.length}개(많이 나온 것부터 · 남은 것은 다음 판에)`);
for (const [w, n] of now) console.log(`${w}\t${n}\t${where.get(w)}`);
