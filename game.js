/* 보물섬 두뇌 탐험대 — 게임 로직 */
(() => {
'use strict';

// ───────── 데이터 ─────────
const CHARS = [
  { id:'cat',     name:'고양이 선장', img:'images/char_cat.png' },
  { id:'robot',   name:'탐험 로봇',   img:'images/char_robot.png' },
  { id:'dino',    name:'아기 공룡',   img:'images/char_dino.png' },
  { id:'penguin', name:'우비 펭귄',   img:'images/char_penguin.png' },
  { id:'fox',     name:'여우 탐정',   img:'images/char_fox.png' },
  { id:'rabbit',  name:'보물 토끼',   img:'images/char_rabbit.png' },
];
const CELL_TYPES = ['start','n','quiz','n','luck','quiz','mini','n','quiz','trap','n','quiz','luck','quiz','n','mini','quiz','n','trap','quiz','n','mini','quiz','luck','n','quiz','mini','quiz','n','goal'];
const CELL_ICON = { quiz:'images/icon_quiz.png', mini:'images/icon_minigame.png', luck:'images/icon_luck.png', trap:'images/icon_trap.png' };
const TYPE_NAME = { pattern:'규칙 찾기', shape:'도형 패턴', logic:'논리 추론', common:'상식 퀴즈', word:'단어 퍼즐' };
const LAST = CELL_TYPES.length - 1;
const LUCKS = [
  { msg:'보물 지도 발견! 3칸 앞으로!', move:3 },
  { msg:'순풍이 분다! 한 번 더 굴려요!', again:true },
  { msg:'반짝이는 별을 주웠어요! ⭐ +1', star:1 },
  { msg:'돌고래가 태워줬어요! 2칸 앞으로!', move:2 },
];

// ───────── 상태 ─────────
const S = {
  playerCount: 1, picks: [null, null], level: 1, timer: true,
  types: ['pattern','shape','logic','common','word'],
  players: [], cur: 0, busy: false, sound: true, used: new Set(),
};

// ───────── 유틸 ─────────
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const wait = ms => new Promise(r => setTimeout(r, ms));
const rnd = n => Math.floor(Math.random() * n);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function showScreen(id) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  $('#' + id).classList.add('active');
}
function bubble(text) { $('#bubble').textContent = text; }

// ───────── 소리 (Web Audio, 파일 없음) ─────────
let AC = null;
function beep(freq = 440, dur = .12, type = 'square', vol = .08, when = 0) {
  if (!S.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, AC.currentTime + when);
    g.gain.exponentialRampToValueAtTime(.001, AC.currentTime + when + dur);
    o.connect(g).connect(AC.destination);
    o.start(AC.currentTime + when); o.stop(AC.currentTime + when + dur + .02);
  } catch (e) {}
}
const SFX = {
  click: () => beep(600, .06, 'square', .05),
  hop:   () => beep(500 + rnd(200), .07, 'triangle', .07),
  dice:  () => beep(300 + rnd(300), .04, 'square', .04),
  good:  () => [523, 659, 784, 1047].forEach((f, i) => beep(f, .15, 'triangle', .09, i * .1)),
  bad:   () => [300, 220].forEach((f, i) => beep(f, .25, 'sawtooth', .06, i * .2)),
  luck:  () => [784, 988, 1175].forEach((f, i) => beep(f, .12, 'sine', .09, i * .08)),
  win:   () => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => beep(f, .25, 'triangle', .1, i * .12)),
  gem:   i => beep([392, 494, 587, 698][i], .22, 'sine', .1),
};

// ───────── 설정 화면 ─────────
function buildSetup() {
  const grid = $('#char-grid');
  grid.innerHTML = CHARS.map((c, i) => `
    <button class="char-card" data-i="${i}">
      <img src="${c.img}" alt="${c.name}"><span>${c.name}</span>
    </button>`).join('');
  grid.addEventListener('click', e => {
    const card = e.target.closest('.char-card'); if (!card) return;
    SFX.click();
    const i = +card.dataset.i;
    if (S.playerCount === 1) { S.picks = [i, null]; }
    else {
      if (S.picks[0] === null) S.picks[0] = i;
      else if (S.picks[1] === null && i !== S.picks[0]) S.picks[1] = i;
      else if (i === S.picks[0]) S.picks[0] = null;
      else if (i === S.picks[1]) S.picks[1] = null;
      else S.picks = [i, null];
    }
    renderPicks();
  });
  $('#seg-players').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    SFX.click();
    $$('#seg-players button').forEach(x => x.classList.toggle('on', x === b));
    S.playerCount = +b.dataset.n; S.picks = [null, null]; renderPicks();
  });
  $('#seg-level').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    SFX.click();
    $$('#seg-level button').forEach(x => x.classList.toggle('on', x === b));
    S.level = +b.dataset.l;
  });
  renderPicks();
}
function renderPicks() {
  $$('.char-card').forEach(c => {
    const i = +c.dataset.i;
    c.classList.toggle('p1', S.picks[0] === i);
    c.classList.toggle('p2', S.picks[1] === i);
    const old = c.querySelector('.tag'); if (old) old.remove();
    if (S.picks[0] === i) c.insertAdjacentHTML('beforeend', '<span class="tag">탐험가 1</span>');
    if (S.picks[1] === i) c.insertAdjacentHTML('beforeend', '<span class="tag">탐험가 2</span>');
  });
  const need = S.playerCount === 1 ? S.picks[0] !== null : S.picks[0] !== null && S.picks[1] !== null;
  $('#btn-go').disabled = !need;
  const hint = $('#pick-hint');
  if (S.playerCount === 1) hint.textContent = S.picks[0] === null ? '캐릭터를 하나 골라요' : '좋아요! 출발 버튼을 눌러요';
  else hint.textContent = S.picks[0] === null ? '탐험가 1의 캐릭터를 골라요' : S.picks[1] === null ? '탐험가 2의 캐릭터를 골라요' : '좋아요! 출발 버튼을 눌러요';
}

// ───────── 게임 시작 ─────────
function startGame() {
  S.timer = $('#opt-timer').checked;
  S.types = $$('.types input:checked').map(i => i.dataset.type);
  if (!S.types.length) S.types = Object.keys(TYPE_NAME);
  S.players = [];
  for (let p = 0; p < S.playerCount; p++) {
    const c = CHARS[S.picks[p]];
    S.players.push({ idx: p, name: S.playerCount === 1 ? c.name : `탐험가 ${p + 1}`, char: c, pos: 0, stars: 0, skip: false, correct: 0, tries: 0 });
  }
  S.cur = 0; S.busy = false; S.used = new Set();
  buildBoard(); buildPieces(); renderTop();
  showScreen('screen-game');
  requestAnimationFrame(() => { placeAll(false); setTimeout(() => placeAll(false), 300); });
  bubble(`${S.players[0].name}, 주사위를 굴려 보세요!`);
  $('#btn-roll').disabled = false;
}

function buildBoard() {
  const bands = $$('.band');
  bands.forEach(b => b.innerHTML = '');
  CELL_TYPES.forEach((t, i) => {
    const row = Math.floor(i / 6);
    const band = bands[row];
    const d = document.createElement('div');
    d.className = `cell ${t}`; d.dataset.i = i;
    if (t === 'start') d.textContent = '출발';
    else if (t === 'goal') d.innerHTML = `<img src="images/treasure_closed.png" alt="보물">`;
    else if (CELL_ICON[t]) d.innerHTML = `<img src="${CELL_ICON[t]}" alt="">`;
    d.insertAdjacentHTML('beforeend', `<span class="num">${i}</span>`);
    if (row % 2 === 1) band.prepend(d); else band.append(d);
  });
}
function buildPieces() {
  const wrap = $('#pieces'); wrap.innerHTML = '';
  S.players.forEach(p => {
    const d = document.createElement('div');
    d.className = `piece ${S.playerCount === 1 ? 'solo' : 'p' + (p.idx + 1)}`;
    d.id = 'piece' + p.idx;
    d.innerHTML = `<img src="${p.char.img}" alt="${p.name}">`;
    wrap.append(d);
  });
}
function cellCenter(i) {
  const cell = $(`.cell[data-i="${i}"]`), board = $('#board');
  const r = cell.getBoundingClientRect(), b = board.getBoundingClientRect();
  return { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height * .55 };
}
function placePiece(p, animate = true) {
  const el = $('#piece' + p.idx); const c = cellCenter(p.pos);
  if (!animate) el.style.transition = 'none';
  el.style.left = c.x + 'px'; el.style.top = c.y + 'px';
  if (!animate) { el.offsetHeight; el.style.transition = ''; }
}
function sizeCells() {
  const band = $('.band'); if (!band) return;
  const r = band.getBoundingClientRect();
  const size = Math.floor(Math.min(r.height * .78, r.width / 6 * .82));
  $('#board').style.setProperty('--cell', size + 'px');
  $('#board').style.setProperty('--piece', Math.round(size * 1.15) + 'px');
}
function placeAll(animate) { sizeCells(); S.players.forEach(p => placePiece(p, animate)); }
window.addEventListener('resize', () => { if ($('#screen-game').classList.contains('active')) placeAll(false); });

function renderTop() {
  const p = S.players[S.cur];
  $('#turn-box').innerHTML = `<img src="${p.char.img}" alt=""><span class="who">${p.name} 차례</span>`;
  $('#scores').innerHTML = S.players.map(q => `<div class="sc ${q === p ? 'me' : ''}"><img src="images/icon_star.png" alt="별"> ${q.stars} <span>· ${q.pos}칸</span></div>`).join('');
  $$('.piece').forEach(el => el.classList.toggle('active', el.id === 'piece' + p.idx));
}

// ───────── 턴 진행 ─────────
async function roll() {
  if (S.busy) return;
  S.busy = true; $('#btn-roll').disabled = true;
  const p = S.players[S.cur];
  const dice = $('#dice'), face = $('#dice-face');
  face.innerHTML = '<i></i>'.repeat(9);
  dice.classList.add('rolling');
  bubble('데굴데굴…');
  const n = 1 + rnd(6);
  for (let t = 0; t < 10; t++) { face.dataset.n = 1 + rnd(6); SFX.dice(); await wait(70); }
  dice.classList.remove('rolling'); face.dataset.n = n;
  dice.classList.add('land'); setTimeout(() => dice.classList.remove('land'), 400);
  beep(700, .15, 'triangle', .1);
  bubble(`${n}이 나왔어요! ${n}칸 앞으로!`);
  await wait(500);
  await movePiece(p, n);
  await landOn(p);
}

async function movePiece(p, steps) {
  const el = $('#piece' + p.idx);
  const dir = steps > 0 ? 1 : -1;
  for (let k = 0; k < Math.abs(steps); k++) {
    if (p.pos + dir < 0 || p.pos + dir > LAST) break;
    p.pos += dir;
    el.classList.remove('hop'); el.offsetHeight; el.classList.add('hop');
    SFX.hop(); placePiece(p);
    const c = $(`.cell[data-i="${p.pos}"]`); c.classList.remove('glow'); c.offsetHeight; c.classList.add('glow');
    await wait(340);
  }
  el.classList.remove('hop');
  renderTop();
}

async function landOn(p, chained = false) {
  const t = CELL_TYPES[p.pos];
  if (p.pos >= LAST) { await finish(p); return; }
  if (chained) { endTurn(); return; }
  if (t === 'quiz') await doQuiz(p, false);
  else if (t === 'trap') await doTrap(p);
  else if (t === 'luck') await doLuck(p);
  else if (t === 'mini') await doMini(p);
  else { bubble(['조용한 길이에요.', '바람이 살랑살랑~', '새소리가 들려요.', '잠깐 쉬어가요.'][rnd(4)]); await wait(700); endTurn(); }
}

function endTurn(again = false) {
  if (!again) S.cur = (S.cur + 1) % S.players.length;
  const p = S.players[S.cur];
  renderTop();
  bubble(again ? `${p.name}, 한 번 더 굴려요!` : `${p.name}, 주사위를 굴려 보세요!`);
  S.busy = false; $('#btn-roll').disabled = false;
}

// ───────── 모달 ─────────
function openModal(html) { const m = $('#modal'); $('#modal-card').innerHTML = html; m.hidden = false; return $('#modal-card'); }
function closeModal() { $('#modal').hidden = true; }
function waitButton(sel, card) { return new Promise(r => { const b = $(sel, card); b.addEventListener('click', () => { SFX.click(); r(); }, { once: true }); }); }

// ───────── 퀴즈 ─────────
function pickQuestion() {
  let pool = QUIZ_BANK.filter(q => S.types.includes(q.type) && (S.level === 0 || q.level === S.level));
  if (!pool.length) pool = QUIZ_BANK.slice();
  let fresh = pool.filter(q => !S.used.has(q));
  if (!fresh.length) { pool.forEach(q => S.used.delete(q)); fresh = pool; }
  const q = fresh[rnd(fresh.length)]; S.used.add(q); return q;
}

function askQuiz(p, titleHtml) {
  return new Promise(resolve => {
    const q = pickQuestion();
    const order = shuffle([0, 1, 2, 3]);
    const card = openModal(`
      <h3>${titleHtml}</h3>
      <div class="lvl">${TYPE_NAME[q.type]} · ${'★'.repeat(q.level)}</div>
      <div class="qtext">${q.q}</div>
      ${S.timer ? '<div class="timerbar"><i id="tbar"></i></div>' : ''}
      <div class="opts">${order.map(i => `<button class="opt" data-i="${i}">${q.o[i]}</button>`).join('')}</div>
      <div class="feedback" id="fb"></div>
      <button class="btn-big" id="btn-next" hidden>확인</button>`);
    let done = false, left = 30, iv = null;
    const bar = $('#tbar', card);
    if (S.timer) {
      iv = setInterval(() => {
        left--; bar.style.width = (left / 30 * 100) + '%';
        if (left <= 8) bar.classList.add('warn');
        if (left <= 5 && left > 0) beep(900, .05, 'square', .04);
        if (left <= 0) settle(null);
      }, 1000);
    }
    function settle(choice) {
      if (done) return; done = true; clearInterval(iv);
      p.tries++;
      const ok = choice === q.a;
      $$('.opt', card).forEach(b => {
        b.disabled = true;
        if (+b.dataset.i === q.a) b.classList.add('right');
        else if (+b.dataset.i === choice) b.classList.add('wrong');
      });
      const fb = $('#fb', card);
      if (ok) { p.correct++; fb.textContent = ['정답! 대단해요!', '딩동댕! 맞았어요!', '천재 탐험가!'][rnd(3)]; fb.className = 'feedback good'; SFX.good(); }
      else { fb.textContent = choice === null ? '시간 초과! 다음엔 더 빨리!' : '아쉬워요! 다음엔 맞힐 수 있어요'; fb.className = 'feedback bad'; SFX.bad(); }
      if (q.h) fb.insertAdjacentHTML('beforeend', `<div style="font-size:18px;font-family:var(--font-body);color:var(--ink);margin-top:4px">${q.h}</div>`);
      const nb = $('#btn-next', card); nb.hidden = false;
      nb.addEventListener('click', () => { SFX.click(); closeModal(); resolve(ok); }, { once: true });
    }
    $$('.opt', card).forEach(b => b.addEventListener('click', () => settle(+b.dataset.i)));
  });
}

async function doQuiz(p) {
  bubble('퀴즈 칸이에요! 문제를 풀어요!');
  const ok = await askQuiz(p, `<img src="images/icon_quiz.png" alt=""> 퀴즈 카드`);
  const el = $('#piece' + p.idx);
  if (ok) {
    p.stars++; renderTop();
    el.classList.add('happy'); setTimeout(() => el.classList.remove('happy'), 600);
    bubble('정답! 별 하나와 2칸 보너스!');
    await wait(600); await movePiece(p, 2); await landOn(p, true);
  } else {
    el.classList.add('sad'); setTimeout(() => el.classList.remove('sad'), 600);
    bubble('괜찮아요, 다음 기회에!'); await wait(600); endTurn();
  }
}

async function doTrap(p) {
  const card = openModal(`
    <h3><img src="images/icon_trap.png" alt=""> 늪에 빠졌다!</h3>
    <img class="big-img" src="images/icon_trap.png" alt="">
    <p>퀴즈를 맞히면 빠져나갈 수 있어요!<br>틀리면 2칸 뒤로…</p>
    <button class="btn-big" id="btn-ok">도전!</button>`);
  SFX.bad(); await waitButton('#btn-ok', card); closeModal();
  const ok = await askQuiz(p, `<img src="images/icon_trap.png" alt=""> 탈출 퀴즈`);
  const el = $('#piece' + p.idx);
  if (ok) { p.stars++; renderTop(); el.classList.add('happy'); setTimeout(() => el.classList.remove('happy'), 600); bubble('탈출 성공! 별도 하나 얻었어요!'); await wait(700); }
  else { el.classList.add('sad'); setTimeout(() => el.classList.remove('sad'), 600); bubble('으악, 2칸 뒤로!'); await wait(500); await movePiece(p, -2); }
  endTurn();
}

async function doLuck(p) {
  const L = LUCKS[rnd(LUCKS.length)];
  SFX.luck();
  const card = openModal(`
    <h3><img src="images/icon_luck.png" alt=""> 행운 칸!</h3>
    <img class="big-img" src="images/icon_luck.png" alt="">
    <p>${L.msg}</p>
    <button class="btn-big" id="btn-ok">좋았어!</button>`);
  await waitButton('#btn-ok', card); closeModal();
  if (L.star) { p.stars += L.star; renderTop(); }
  if (L.move) { bubble(L.msg); await movePiece(p, L.move); await landOn(p, true); return; }
  endTurn(!!L.again);
}

// ───────── 미니게임: 순서 기억하기 ─────────
function simonGame() {
  return new Promise(resolve => {
    const emo = ['💎', '🔮', '🍀', '⭐'];
    const card = openModal(`
      <h3><img src="images/icon_minigame.png" alt=""> 보석 순서 기억하기</h3>
      <p>불이 들어오는 순서를 잘 보고 똑같이 눌러요!</p>
      <div class="simon">${[0,1,2,3].map(i => `<button class="gem g${i}" data-i="${i}" disabled>${emo[i]}</button>`).join('')}</div>
      <div class="simon-status" id="st">준비…</div>
      <button class="btn-big" id="btn-go2">시작!</button>`);
    const gems = $$('.gem', card), st = $('#st', card);
    const seq = []; let round = 0, input = [], listening = false;
    const TARGET = 3; // 3라운드(길이 2,3,4) 성공하면 클리어
    async function flash(i, ms = 450) { gems[i].classList.add('lit'); SFX.gem(i); await wait(ms); gems[i].classList.remove('lit'); await wait(150); }
    async function play() {
      round++; seq.push(rnd(4)); input = [];
      st.textContent = `${round}라운드 — 잘 봐요!`; gems.forEach(g => g.disabled = true);
      await wait(600);
      for (const i of seq) await flash(i);
      st.textContent = '이제 똑같이 눌러요!'; gems.forEach(g => g.disabled = false); listening = true;
    }
    gems.forEach(g => g.addEventListener('click', async () => {
      if (!listening) return;
      const i = +g.dataset.i;
      g.classList.add('lit'); SFX.gem(i); setTimeout(() => g.classList.remove('lit'), 200);
      input.push(i);
      const k = input.length - 1;
      if (input[k] !== seq[k]) {
        listening = false; gems.forEach(x => x.disabled = true); SFX.bad();
        st.textContent = '앗, 순서가 달라요!';
        await wait(900); closeModal(); resolve(false); return;
      }
      if (input.length === seq.length) {
        listening = false; gems.forEach(x => x.disabled = true);
        if (round >= TARGET) { SFX.good(); st.textContent = '완벽해요! 클리어!'; await wait(900); closeModal(); resolve(true); return; }
        st.textContent = '잘했어요!'; await wait(700); play();
      }
    }));
    $('#btn-go2', card).addEventListener('click', e => { SFX.click(); e.target.hidden = true; play(); }, { once: true });
  });
}

async function doMini(p) {
  bubble('미니게임 칸이에요!');
  const ok = await simonGame();
  const el = $('#piece' + p.idx);
  if (ok) {
    p.stars += 2; renderTop();
    el.classList.add('happy'); setTimeout(() => el.classList.remove('happy'), 600);
    bubble('미니게임 성공! 별 2개와 3칸 보너스!');
    await wait(600); await movePiece(p, 3); await landOn(p, true);
  } else {
    el.classList.add('sad'); setTimeout(() => el.classList.remove('sad'), 600);
    bubble('아쉽지만 벌칙은 없어요!'); await wait(700); endTurn();
  }
}

// ───────── 결과 ─────────
function grade(stars) {
  if (stars >= 8) return { img: 'images/badge_3.png', name: '전설의 탐험가' };
  if (stars >= 4) return { img: 'images/badge_2.png', name: '어엿한 선장' };
  return { img: 'images/badge_1.png', name: '견습 탐험가' };
}
async function finish(winner) {
  const goal = $('.cell.goal'); goal.innerHTML = `<img src="images/treasure_open.png" alt="보물">`;
  goal.classList.add('glow');
  bubble(`${winner.name}, 보물을 찾았어요!!`);
  SFX.win();
  $('#piece' + winner.idx).classList.add('happy');
  await wait(1600);
  const ranked = [...S.players].sort((a, b) => (b.pos - a.pos) || (b.stars - a.stars));
  $('#result-title').textContent = S.playerCount === 1 ? '보물을 찾았다!' : `${winner.name} 승리!`;
  $('#result-players').innerHTML = ranked.map((q, i) => {
    const g = grade(q.stars);
    return `<div class="rp ${q === winner ? 'winner' : ''}" style="animation-delay:${.3 + i * .25}s">
      ${S.playerCount > 1 ? `<div class="rank">${i + 1}등</div>` : ''}
      <img class="ch" src="${q.char.img}" alt="">
      <div class="nm">${q.name}</div>
      <div class="st">⭐ ${q.stars}개 · 퀴즈 ${q.correct}/${q.tries}</div>
      <img class="bd" src="${g.img}" alt="">
      <div class="grade">${g.name}</div>
    </div>`;
  }).join('');
  const cf = $('#confetti'); cf.innerHTML = '';
  const colors = ['#ff6b57', '#35b6d9', '#58c15b', '#ffcc3a', '#c77dff', '#fff'];
  for (let i = 0; i < 70; i++) {
    cf.insertAdjacentHTML('beforeend', `<i style="left:${rnd(100)}%;background:${colors[rnd(colors.length)]};animation-duration:${2.5 + Math.random() * 3}s;animation-delay:${Math.random() * 3}s;transform:scale(${.6 + Math.random()})"></i>`);
  }
  showScreen('screen-result');
}

// ───────── 게임 방법 ─────────
function howto() {
  const card = openModal(`
    <h3>게임 방법</h3>
    <ol class="howto">
      <li>주사위를 굴려 나온 수만큼 말이 앞으로 가요.</li>
      <li><img src="images/icon_quiz.png" alt=""> 퀴즈 칸: 문제를 맞히면 별 1개 + 2칸 보너스!</li>
      <li><img src="images/icon_minigame.png" alt=""> 미니게임 칸: 성공하면 별 2개 + 3칸 보너스!</li>
      <li><img src="images/icon_luck.png" alt=""> 행운 칸: 좋은 일이 생겨요!</li>
      <li><img src="images/icon_trap.png" alt=""> 늪 칸: 퀴즈를 맞히면 탈출, 틀리면 2칸 뒤로!</li>
      <li>먼저 보물상자에 도착하면 승리! 별을 많이 모으면 더 높은 등급을 받아요.</li>
    </ol>
    <button class="btn-big" id="btn-ok">알겠어요!</button>`);
  waitButton('#btn-ok', card).then(closeModal);
}

// ───────── 이벤트 연결 ─────────
$('#btn-start').addEventListener('click', () => { SFX.click(); showScreen('screen-setup'); });
$('#btn-howto').addEventListener('click', () => { SFX.click(); howto(); });
$('#btn-go').addEventListener('click', () => { SFX.click(); startGame(); });
$('#btn-roll').addEventListener('click', roll);
$('#btn-again').addEventListener('click', () => { SFX.click(); showScreen('screen-setup'); });
$$('.btn-home').forEach(b => b.addEventListener('click', () => { SFX.click(); closeModal(); showScreen('screen-title'); }));
$('.btn-sound').addEventListener('click', e => { S.sound = !S.sound; e.currentTarget.textContent = S.sound ? '🔊' : '🔇'; if (S.sound) SFX.click(); });

// 이미지 미리 불러오기
['images/treasure_open.png', 'images/badge_1.png', 'images/badge_2.png', 'images/badge_3.png', 'images/bg_cave.jpg', ...CHARS.map(c => c.img)].forEach(src => { const i = new Image(); i.src = src; });

buildSetup();
})();
