import { MODEL, coach, evaluate, policyWithBeginnerNext, policyThreshold } from './engine.mjs';
import { TOPICS, DEMO_PATTERNS } from './questions.mjs';

const $ = (sel) => document.querySelector(sel);
const fmtP = (p) => `${(p * 100).toFixed(1)}%`;
const f2 = (x) => Number(x).toFixed(2);
const f3 = (x) => Number(x).toFixed(3);
const f4 = (x) => Number(x).toFixed(4);
const sci = (x) => Number(x).toExponential(3);
const signed = (x) => (x > 0 ? `+${x}` : x < 0 ? `−${Math.abs(x)}` : '0');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STATES = MODEL.hmm.states;
const NEXT = 'Next question';

// Signature: a filled dot is a correct answer, an open ring is a wrong one.
const marks = (answers, label = true) => answers.map((a) => `<i class="mark ${a ? 'ok' : 'no'}"${label ? ` title="${a ? 'Correct' : 'Wrong'}"` : ''}></i>`).join('');

const N = 5;
const state = {
  topic: null,
  index: 0,     // current question index
  answers: [],  // booleans
  chosen: [],   // chosen option per question
  taken: [],    // coaching action actually taken after each answer
  phase: 'ask', // ask | feedback | review
  demo: null,
  log: [],
};

// ---------- start screen ----------
function renderStart() {
  $('#topic-list').innerHTML = TOPICS.map((t) => `
    <li><button class="topic" type="button" data-topic="${t.id}">
      <span class="topic-title">${esc(t.title)}</span>
      <span class="topic-meta">${esc(t.week)}. ${esc(t.blurb)}</span>
    </button></li>`).join('');
  $('#demo-list').innerHTML = DEMO_PATTERNS.map((d) => `
    <button class="demo" type="button" data-demo="${d.id}">
      <span class="marks" aria-hidden="true">${marks(d.answers, false)}</span>
      <span>${esc(d.label)}</span>
    </button>`).join('');
  renderPreview();
  renderEvaluation();
  renderWhatIf();
  renderAssumptions();
}

function renderPreview() {
  const answers = [false, true, true];
  const res = coach(answers); // the quiz just goes on between answers, as in the assignment
  $('#preview-marks').innerHTML = marks(answers);
  renderTrellis($('#preview-trellis'), res, answers.length, { forceCompact: true });
  $('#preview-out').innerHTML = `
    <div><dt>Knowledge after answer 1</dt><dd>${fmtP(res.bayes[0].posterior)}</dd></div>
    <div><dt>Most likely stages</dt><dd>${res.viterbi.path.map((s) => STATES[s]).join(' → ')}</dd></div>
    <div><dt>Recommended action</dt><dd class="rec">${res.action}</dd></div>`;
}

function renderEvaluation() {
  const rows = evaluate();
  const lo = -4, hi = 13;
  const x = (v) => ((v - lo) / (hi - lo)) * 100;
  const zero = x(0);
  $('#eval-list').innerHTML = rows.map((r) => {
    const left = Math.min(zero, x(r.reward)), width = Math.abs(x(r.reward) - zero);
    return `<li class="eval-row ${r.id === 'coach' ? 'lead' : ''} ${r.id === 'oracle' ? 'bound' : ''}">
      <span class="eval-name">${esc(r.name)}</span>
      <span class="eval-bar" aria-hidden="true"><i class="zero" style="left:${zero}%"></i><b style="left:${left}%;width:${width}%"></b></span>
      <span class="eval-num">${r.reward < 0 ? '−' : ''}${f2(Math.abs(r.reward))}</span>
    </li>`;
  }).join('');
  const by = Object.fromEntries(rows.map((r) => [r.id, r]));
  $('#eval-finding').innerHTML = `The coach earns ${f2(by.coach.reward)} of the ${f2(by.oracle.reward)} possible if the true stage were known. Reacting only to the last answer gives ${f2(by.last.reward)}, because one answer is noisy. Bayes alone gives ${f2(by.bayes.reward)}: it assumes knowledge never changes, so early mistakes keep it reviewing after the student has improved.`;
}

function renderWhatIf() {
  const input = $('#whatif-r');
  const th = policyThreshold();
  const update = () => {
    const r = Number(input.value);
    const sol = policyWithBeginnerNext(r);
    $('#whatif-val').textContent = signed(r);
    $('#whatif-out').innerHTML = STATES.map((s) => `
      <div><dt>${s}</dt><dd><span class="rec">${sol.policy[s]}</span>
      <span class="small muted">Review ${f2(sol.Q[s].Review)}, Next ${f2(sol.Q[s][NEXT])}</span></dd></div>`).join('');
    $('#whatif-note').textContent = `The Beginner policy flips to Next question once this reward reaches ${f2(th)}. Below that, reviewing first is worth more in the long run, even though it earns little now.`;
  };
  input.addEventListener('input', update);
  update();
}

function show(view) {
  for (const v of ['start', 'quiz', 'summary']) $(`#view-${v}`).hidden = v !== view;
  window.scrollTo({ top: 0 });
}

function startQuiz(topicId, demo = null) {
  state.topic = TOPICS.find((t) => t.id === topicId);
  Object.assign(state, { index: 0, answers: [], chosen: [], taken: [], phase: 'ask', demo, log: [] });
  $('#quiz-topic').textContent = state.topic.title;
  show('quiz');
  renderQuiz();
}

const current = () => coach(state.answers, state.taken);

// ---------- quiz ----------
function renderQuiz() {
  const res = current();
  renderTrellis($('#trellis'), res, N);
  renderSheet(res);
  renderReasoning(res);
  $('#topbar-status').textContent = state.demo ? `Demo: ${state.demo.label}` : `${state.topic.title}, question ${Math.min(state.index + 1, N)} of ${N}`;
}

function renderSheet(res) {
  const q = state.topic.questions[state.index];
  const sheet = $('#sheet');
  const progress = `<p class="q-count">Question ${state.index + 1} of ${N}</p>`;

  if (state.phase === 'ask') {
    const demoBtn = state.demo
      ? `<p class="muted">Demo mode: Üki will answer ${state.demo.answers[state.index] ? 'correctly' : 'incorrectly'}.</p>
         <div class="actions"><button class="btn btn-primary" type="button" data-action="demo-answer">Play the demo answer</button></div>`
      : '';
    sheet.innerHTML = `${progress}
      <h2 class="q-text">${esc(q.q)}</h2>
      <div class="options" role="group" aria-label="Answer options">
        ${q.options.map((o, i) => `<button class="option" type="button" data-option="${i}" ${state.demo ? 'disabled' : ''}><kbd class="opt-key">${'ABCD'[i]}</kbd><span>${esc(o)}</span></button>`).join('')}
      </div>${demoBtn}`;
    return;
  }

  const chosen = state.chosen[state.index];
  const correct = chosen === q.answer;
  const optionsHtml = q.options.map((o, i) => {
    const cls = i === q.answer ? 'is-correct' : i === chosen ? 'is-wrong' : '';
    return `<div class="option static ${cls}"><kbd class="opt-key">${'ABCD'[i]}</kbd><span>${esc(o)}</span></div>`;
  }).join('');
  const last = state.index === N - 1;

  if (state.phase === 'feedback') {
    const rec = res.action;
    let actions;
    if (last) {
      actions = `<button class="btn btn-primary" type="button" data-action="summary">See your session summary</button>`;
    } else if (rec === 'Review') {
      actions = `<button class="btn btn-primary" type="button" data-action="review">Review the idea</button>
                 <button class="btn btn-quiet" type="button" data-action="next">Skip to question ${state.index + 2}</button>`;
    } else {
      actions = `<button class="btn btn-primary" type="button" data-action="next">Go to question ${state.index + 2}</button>
                 <button class="btn btn-quiet" type="button" data-action="review">Review anyway</button>`;
    }
    sheet.innerHTML = `${progress}
      <h2 class="q-text">${esc(q.q)}</h2>
      <div class="options">${optionsHtml}</div>
      <div class="feedback ${correct ? 'good' : 'bad'}"><p><strong>${correct ? 'Correct' : 'Not this time'}</strong></p><p>${esc(q.explain)}</p></div>
      ${last ? '' : `<p class="coach-line">Üki recommends <strong>${esc(rec)}</strong>. ${rec === 'Review' ? 'In the Beginner stage a review is worth more than a new question.' : 'In the Ready stage a new question is worth more than another review.'}</p>`}
      <div class="actions">${actions}</div>`;
    return;
  }

  sheet.innerHTML = `${progress}
    <h2 class="q-text">Review the idea</h2>
    <div class="review-card"><p>${esc(q.review)}</p></div>
    <p class="muted small">You chose ${'ABCD'[chosen]}, the answer was ${'ABCD'[q.answer]}. ${esc(q.explain)}</p>
    <p class="muted small">Because you reviewed, the model now expects a Beginner to reach Ready with probability ${MODEL.mdp.P.Beginner.Review[1]} before the next answer, instead of ${MODEL.mdp.P.Beginner[NEXT][1]}.</p>
    <div class="actions"><button class="btn btn-primary" type="button" data-action="next">Continue to question ${state.index + 2}</button></div>`;
}

function answer(optionIndex) {
  const q = state.topic.questions[state.index];
  state.chosen[state.index] = optionIndex;
  state.answers.push(optionIndex === q.answer);
  state.phase = 'feedback';
  const res = current();
  state.log.push({ q: state.index + 1, correct: optionIndex === q.answer, knowledge: res.knowledge, stage: res.stage, pReady: res.pReady, action: res.action });
  renderQuiz();
  const fb = $('#sheet .feedback');
  fb?.setAttribute('tabindex', '-1');
  fb?.focus({ preventScroll: true });
}

function next() {
  if (state.index >= N - 1) return;
  state.taken[state.index] ??= NEXT;
  state.index += 1;
  state.phase = 'ask';
  renderQuiz();
  $('#sheet .option')?.focus({ preventScroll: true });
}

// ---------- reasoning panel ----------
function renderReasoning(res) {
  const n = res.answers.length;
  const el = $('#reasoning');
  if (n === 0) {
    el.innerHTML = `<h2 class="h-reason">How Üki is reasoning</h2>
      <p class="muted">Nothing to reason about yet. Before the first answer Üki assumes a ${fmtP(MODEL.bayes.prior)} chance that you know the topic and a ${fmtP(MODEL.hmm.pi[1])} chance that you are already in the Ready stage.</p>`;
    return;
  }
  const b = res.bayes[n - 1];
  const vit = res.viterbi;
  const d = vit.delta[n - 1];
  const pathNames = vit.path.map((s) => STATES[s]);
  const Q = res.mdp.Q[res.stage];
  const R = res.immediate[res.stage];
  const [a1, a2] = MODEL.mdp.actions;
  const w = b.correct ? 'correct' : 'wrong';
  const between = n > 1 ? res.actions[n - 2] : null;
  const transLine = between
    ? `<p>Between answers ${n - 1} and ${n} you ${between === 'Review' ? 'reviewed' : 'went straight on'}, so P(Beginner → Ready) = ${MODEL.mdp.P.Beginner[between][1]}.</p>`
    : `<p>First answer: δ₁ = π × P(${w} | stage).</p>`;

  el.innerHTML = `
    <h2 class="h-reason">How Üki reasoned after answer ${n}</h2>

    <section class="step" aria-labelledby="s1">
      <h3 id="s1"><span class="step-n">1</span> Do you know the topic? <span class="algo">Bayesian inference</span></h3>
      <p class="io"><span>Input</span> prior P(know) = ${f4(b.prior)}, answer ${n} was ${w}</p>
      <div class="calc">
        <p>P(${w} | know) = ${b.likeKnow}, P(${w} | don’t know) = ${b.likeNot}</p>
        <p>P(know | ${w}) = ${b.likeKnow} × ${f4(b.prior)} / (${f4(b.jointKnow)} + ${f4(b.jointNot)}) = <strong>${f4(b.posterior)}</strong></p>
      </div>
      <div class="meter" role="img" aria-label="Knowledge probability ${fmtP(res.knowledge)}, mastery line at ${fmtP(MODEL.bayes.mastery)}"><span style="transform:scaleX(${res.knowledge.toFixed(4)})"></span><i style="left:${MODEL.bayes.mastery * 100}%"></i></div>
      <p class="out"><span>Output</span> <strong>${fmtP(res.knowledge)}</strong> chance you know this topic${res.mastered ? ', above the 85% mastery line' : ''}</p>
      <p class="why">Each answer is evidence. Bayes’ rule weighs how likely that answer is if you know the topic against how likely it is if you are guessing.</p>
    </section>

    <section class="step" aria-labelledby="s2">
      <h3 id="s2"><span class="step-n">2</span> Which stage are you in? <span class="algo">HMM and Viterbi</span></h3>
      <p class="io"><span>Input</span> <span class="marks">${marks(res.answers)}</span></p>
      <div class="calc">
        ${transLine}
        <p>δ${n}(Beginner) = ${sci(d[0])}, δ${n}(Ready) = ${sci(d[1])}</p>
        <p>Back-tracking from the larger δ gives ${pathNames.join(' → ')}</p>
        <p>Filtered P(Ready now) = ${f3(res.pReady)}</p>
      </div>
      <p class="out"><span>Output</span> current stage <strong class="stage stage-${res.stage.toLowerCase()}">${res.stage}</strong></p>
      <p class="why">Unlike step 1, the stage can change. Viterbi uses all answers together and finds the single most likely sequence of stages.</p>
      ${res.stage === 'Ready' && res.knowledge < 0.5 ? `<p class="note">Why does step 1 still say ${fmtP(res.knowledge)}? Bayes assumes your knowledge is fixed, so early mistakes keep counting. The HMM lets you improve, so recent correct answers move you to Ready. The two models answer different questions.</p>` : ''}
    </section>

    <section class="step" aria-labelledby="s3">
      <h3 id="s3"><span class="step-n">3</span> What should happen next? <span class="algo">MDP</span></h3>
      <p class="io"><span>Input</span> stage ${res.stage}, γ = ${MODEL.mdp.gamma}</p>
      <table class="qtable">
        <thead><tr><th scope="col">Action</th><th scope="col">One-step reward</th><th scope="col">Long-term Q</th></tr></thead>
        <tbody>
          <tr class="${res.action === a1 ? 'win' : ''}"><th scope="row">${a1}</th><td>${signed(R[a1])}</td><td>${f2(Q[a1])}</td></tr>
          <tr class="${res.action === a2 ? 'win' : ''}"><th scope="row">${a2}</th><td>${signed(R[a2])}</td><td>${f2(Q[a2])}</td></tr>
        </tbody>
      </table>
      <p class="out"><span>Output</span> recommend <strong>${res.action}</strong></p>
      <p class="why">The one-step reward is one Bellman update from zero. Value iteration repeats the update (${res.mdp.iterations} sweeps) and adds the discounted value of the stage each action leads to. Soft check with P(Ready) = ${f3(res.pReady)}: Review ${f2(res.soft[a1])}, Next question ${f2(res.soft[a2])}.</p>
    </section>`;
}

// ---------- trellis ----------
function renderTrellis(svg, res, cols, { forceCompact = false } = {}) {
  const n = res.answers.length;
  const compact = forceCompact || (svg.parentElement.clientWidth || 760) < 560;
  const W = compact ? 400 : 760, H = 216;
  const x0 = compact ? 100 : 128, right = compact ? 36 : 48;
  const colW = cols > 1 ? (W - x0 - right) / (cols - 1) : 0;
  const yR = 56, yB = 136;
  const X = (t) => x0 + t * colW;
  const parts = [];
  svg.classList.toggle('compact', compact);
  parts.push(`<text class="t-row" x="${compact ? 4 : 20}" y="${yR + 5}">Ready</text><text class="t-row" x="${compact ? 4 : 20}" y="${yB + 5}">Beginner</text>`);
  for (let t = 0; t < cols; t++) parts.push(`<line class="t-grid" x1="${X(t)}" x2="${X(t)}" y1="32" y2="${yB + 24}"/>`);
  for (let t = 1; t < n; t++) {
    for (const ya of [yR, yB]) for (const yb of [yR, yB]) parts.push(`<line class="t-edge" x1="${X(t - 1)}" y1="${ya}" x2="${X(t)}" y2="${yb}"/>`);
    if (res.actions[t - 1] === 'Review') parts.push(`<text class="t-act" x="${(X(t - 1) + X(t)) / 2}" y="${yB + 20}">review</text>`);
  }
  if (n > 0) parts.push(`<polyline class="t-path" points="${res.viterbi.path.map((s, t) => `${X(t)},${s === 1 ? yR : yB}`).join(' ')}"/>`);
  for (let t = 0; t < cols; t++) {
    if (t >= n) {
      parts.push(`<circle class="t-node empty" cx="${X(t)}" cy="${yR}" r="14"/><circle class="t-node empty" cx="${X(t)}" cy="${yB}" r="14"/>`);
    } else {
      const bel = res.filter[t].belief;
      const on = res.viterbi.path[t];
      const r0 = compact ? 8 : 10;
      parts.push(`<circle class="t-node ready ${on === 1 ? 'on' : ''}" cx="${X(t)}" cy="${yR}" r="${(r0 + r0 * bel[1]).toFixed(1)}"/>`);
      parts.push(`<circle class="t-node beginner ${on === 0 ? 'on' : ''}" cx="${X(t)}" cy="${yB}" r="${(r0 + r0 * bel[0]).toFixed(1)}"/>`);
      parts.push(`<text class="t-prob" x="${X(t)}" y="${yR - 28}">${Math.round(bel[1] * 100)}%</text>`);
      parts.push(`<text class="t-prob" x="${X(t)}" y="${yB + 36}">${Math.round(bel[0] * 100)}%</text>`);
    }
    const y = H - 10;
    parts.push(`<text class="t-obs" x="${X(t) - 7}" y="${y}">Q${t + 1}</text>`);
    if (t < n) parts.push(`<circle class="t-mark ${res.answers[t] ? 'ok' : 'no'}" cx="${X(t) + 13}" cy="${y - 5}" r="5"/>`);
  }
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const desc = n ? `Viterbi path: ${res.viterbi.path.map((s) => STATES[s]).join(', ')}. Percentages are filtered stage probabilities.` : 'No answers yet.';
  svg.innerHTML = (svg.id === 'trellis' ? `<title id="trellis-title">Learning-stage trellis</title><desc id="trellis-desc">${desc}</desc>` : `<title>${desc}</title>`) + parts.join('');
}

// ---------- summary ----------
function renderSummary() {
  const res = current();
  const path = res.viterbi.path.map((s) => STATES[s]);
  const correctCount = state.answers.filter(Boolean).length;
  const advice = res.mastered
    ? `You are above the mastery line for ${state.topic.title}. Move on to another topic.`
    : res.stage === 'Ready'
      ? `You finished in the Ready stage, but the knowledge estimate is still below 85%. One more short round on ${state.topic.title} should settle it.`
      : `You are still in the Beginner stage. Read the review cards, then try ${state.topic.title} again.`;
  $('#view-summary').innerHTML = `
    <div class="summary-head">
      <p class="marks big" aria-hidden="true">${marks(state.answers)}</p>
      <h1 id="summary-title">${correctCount} of ${N} correct on ${esc(state.topic.title)}</h1>
      <p class="lede">${esc(advice)}</p>
    </div>
    <dl class="summary-facts">
      <div><dt>Chance you know the topic</dt><dd>${fmtP(res.knowledge)}</dd><dd class="small muted">Bayesian inference over ${N} answers</dd></div>
      <div><dt>Most likely stage path</dt><dd class="path">${path.map((p) => `<span class="stage stage-${p.toLowerCase()}">${p}</span>`).join('')}</dd><dd class="small muted">Viterbi, joint probability ${sci(res.viterbi.pathProb)}</dd></div>
      <div><dt>Coach’s policy</dt><dd class="policy">Beginner → ${res.mdp.policy.Beginner}<br>Ready → ${res.mdp.policy.Ready}</dd><dd class="small muted">Value iteration, γ = ${MODEL.mdp.gamma}</dd></div>
    </dl>
    <h2 class="h-section">Answer by answer</h2>
    <div class="table-scroll"><table class="log">
      <thead><tr><th scope="col">Question</th><th scope="col">Answer</th><th scope="col" class="num">P(know)</th><th scope="col">Stage then</th><th scope="col" class="num">P(Ready)</th><th scope="col">Üki recommended</th><th scope="col">You did</th></tr></thead>
      <tbody>${state.log.map((r, i) => `<tr><td>Q${r.q}</td><td><i class="mark ${r.correct ? 'ok' : 'no'}"></i> ${r.correct ? 'Correct' : 'Wrong'}</td><td class="num">${fmtP(r.knowledge)}</td><td>${r.stage}</td><td class="num">${fmtP(r.pReady)}</td><td>${r.action}</td><td>${i < N - 1 ? state.taken[i] ?? '' : 'End of quiz'}</td></tr>`).join('')}</tbody>
    </table></div>
    <p class="muted small">The stage in each row is the last state of the Viterbi path at that moment. Later answers can change how earlier stages look on the final path above.</p>
    <div class="actions">
      <button class="btn btn-primary" type="button" data-action="retry">Try ${esc(state.topic.title)} again</button>
      <button class="btn btn-quiet" type="button" data-action="home">Choose another topic</button>
    </div>`;
  show('summary');
  $('#topbar-status').textContent = 'Session summary';
}

// ---------- assumptions ----------
function renderAssumptions() {
  const { bayes, hmm, mdp } = MODEL;
  const pRow = (s) => mdp.actions.map((a) => `<tr><th scope="row">${s}, ${a}</th><td>${mdp.P[s][a][0]}</td><td>${mdp.P[s][a][1]}</td><td>${signed(mdp.R[s][a])}</td></tr>`).join('');
  $('#assumptions-body').innerHTML = `
    <div class="assume-col">
      <h3>Bayesian inference</h3>
      <p>Prior P(know) = ${bayes.prior}. Slip P(wrong | know) = ${bayes.slip}. Guess P(correct | don’t know) = ${bayes.guess}, one of four options. Mastery line ${bayes.mastery}. Answers are independent given knowledge.</p>
    </div>
    <div class="assume-col">
      <h3>Hidden Markov model</h3>
      <p>States Beginner and Ready, π = (${hmm.pi.join(', ')}). Transitions are the MDP rows for the action between answers, Next question by default.</p>
      <table class="mini"><thead><tr><th></th><th scope="col">→ Beginner</th><th scope="col">→ Ready</th><th scope="col">P(correct)</th></tr></thead>
      <tbody><tr><th scope="row">Beginner</th><td>${hmm.T[0][0]}</td><td>${hmm.T[0][1]}</td><td>${hmm.E[0][1]}</td></tr>
      <tr><th scope="row">Ready</th><td>${hmm.T[1][0]}</td><td>${hmm.T[1][1]}</td><td>${hmm.E[1][1]}</td></tr></tbody></table>
    </div>
    <div class="assume-col">
      <h3>Markov decision process</h3>
      <p>γ = ${mdp.gamma}. Next-stage probabilities and immediate rewards.</p>
      <table class="mini"><thead><tr><th></th><th scope="col">P(Beginner)</th><th scope="col">P(Ready)</th><th scope="col">Reward</th></tr></thead>
      <tbody>${pRow('Beginner')}${pRow('Ready')}</tbody></table>
    </div>
    <p class="small muted assume-note">These are hypothetical values chosen to be easy to check by hand. A real coach would estimate them from student data, for example with Baum–Welch for the HMM.</p>`;
}

// ---------- events ----------
document.addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  if (t.dataset.topic) return startQuiz(t.dataset.topic);
  if (t.dataset.demo) return startQuiz('python', DEMO_PATTERNS.find((p) => p.id === t.dataset.demo));
  if (t.dataset.option !== undefined && state.phase === 'ask') return answer(Number(t.dataset.option));
  switch (t.dataset.action) {
    case 'demo-answer': {
      const q = state.topic.questions[state.index];
      return answer(state.demo.answers[state.index] ? q.answer : (q.answer + 1) % 4);
    }
    case 'review': state.taken[state.index] = 'Review'; state.phase = 'review'; renderQuiz(); return;
    case 'next': return next();
    case 'summary': return renderSummary();
    case 'retry': return startQuiz(state.topic.id, state.demo);
    case 'home': show('start'); $('#topbar-status').textContent = ''; return;
  }
});

document.addEventListener('keydown', (e) => {
  if ($('#view-quiz').hidden || state.phase !== 'ask' || state.demo) return;
  const i = 'ABCD'.indexOf(e.key.toUpperCase());
  if (i >= 0 && !e.metaKey && !e.ctrlKey && !e.altKey && !(e.target instanceof HTMLInputElement)) answer(i);
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (!$('#view-quiz').hidden) renderTrellis($('#trellis'), current(), N); }, 150);
});

renderStart();
