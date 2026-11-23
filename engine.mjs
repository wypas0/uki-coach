// Üki Coach — algorithm engine (pure functions, no DOM).
// The same model and numbers are implemented in python/quiz_coach.py.

// ---------------------------------------------------------------
// Model assumptions (hypothetical, clearly labelled teaching values)
// ---------------------------------------------------------------
const STATES = ['Beginner', 'Ready'];
const ACTIONS = ['Review', 'Next question'];

const MDP = {
  states: STATES,
  actions: ACTIONS,
  gamma: 0.9,
  // P[s][a] = [P(next = Beginner), P(next = Ready)]
  P: {
    Beginner: { 'Review': [0.4, 0.6], 'Next question': [0.8, 0.2] },
    Ready:    { 'Review': [0.0, 1.0], 'Next question': [0.1, 0.9] },
  },
  // R[s][a] = immediate reward (learning value minus wasted time)
  R: {
    Beginner: { 'Review': 1, 'Next question': -2 },
    Ready:    { 'Review': -1, 'Next question': 3 },
  },
};

export const MODEL = {
  bayes: {
    prior: 0.5,    // P(knows topic) before the first answer
    slip: 0.1,     // P(wrong | knows)   -> P(correct | knows) = 0.9
    guess: 0.25,   // P(correct | does not know): 1 of 4 options
    mastery: 0.85, // threshold for calling the topic "mastered"
  },
  hmm: {
    states: STATES,
    pi: [0.7, 0.3],
    // The stage moves exactly as in the MDP when the quiz just goes on:
    T: [MDP.P.Beginner['Next question'], MDP.P.Ready['Next question']], // [[0.8, 0.2], [0.1, 0.9]]
    // emission P(observation | state); observations: 0 = Wrong, 1 = Correct
    E: [[0.65, 0.35],  // Beginner
        [0.25, 0.75]], // Ready
  },
  mdp: MDP,
};

const NEXT = 'Next question';
// P(stage j at the next answer | stage i now, coaching action in between)
const trans = (i, j, action = NEXT) => MDP.P[STATES[i]][action][j];

// ---------------------------------------------------------------
// 1. Bayesian inference: P(knows topic | answer)
// ---------------------------------------------------------------
export function bayesUpdate(prior, correct, { slip, guess } = MODEL.bayes) {
  const likeKnow = correct ? 1 - slip : slip;
  const likeNot = correct ? guess : 1 - guess;
  const jointKnow = likeKnow * prior;
  const jointNot = likeNot * (1 - prior);
  const evidence = jointKnow + jointNot;
  return { prior, correct, likeKnow, likeNot, jointKnow, jointNot, evidence, posterior: jointKnow / evidence };
}

export function bayesSequence(answers, params = MODEL.bayes) {
  const steps = [];
  let p = params.prior;
  for (const c of answers) {
    const s = bayesUpdate(p, c, params);
    steps.push(s);
    p = s.posterior;
  }
  return steps;
}

// ---------------------------------------------------------------
// 2. HMM: Viterbi + forward filtering.
// actions[t-1] is the coaching action between answer t-1 and answer t.
// ---------------------------------------------------------------
export function viterbi(obs, actions = []) {
  const { pi, E } = MODEL.hmm;
  const n = obs.length;
  if (n === 0) return { delta: [], back: [], path: [], pathProb: 0 };
  const delta = [pi.map((p, j) => p * E[j][obs[0]])];
  const back = [[null, null]];
  for (let t = 1; t < n; t++) {
    const a = actions[t - 1] ?? NEXT;
    const row = [], bp = [];
    for (let j = 0; j < 2; j++) {
      let best = -1, arg = 0;
      for (let i = 0; i < 2; i++) {
        const v = delta[t - 1][i] * trans(i, j, a);
        if (v > best) { best = v; arg = i; }
      }
      row.push(best * E[j][obs[t]]);
      bp.push(arg);
    }
    delta.push(row); back.push(bp);
  }
  const last = delta[n - 1][1] > delta[n - 1][0] ? 1 : 0;
  const path = [last];
  for (let t = n - 1; t > 0; t--) path.unshift(back[t][path[0]]);
  return { delta, back, path, pathProb: delta[n - 1][last] };
}

export function forwardFilter(obs, actions = []) {
  const { pi, E } = MODEL.hmm;
  const beliefs = [];
  let b = null;
  obs.forEach((o, t) => {
    const a = actions[t - 1] ?? NEXT;
    const pred = t === 0 ? pi.slice() : [0, 1].map((j) => b[0] * trans(0, j, a) + b[1] * trans(1, j, a));
    const w = pred.map((p, j) => p * E[j][o]);
    const z = w[0] + w[1];
    b = w.map((x) => x / z);
    beliefs.push({ predicted: pred, belief: b });
  });
  return beliefs;
}

// ---------------------------------------------------------------
// 3. MDP: Bellman update and value iteration
// ---------------------------------------------------------------
export function bellmanUpdate(V, R = MDP.R) {
  const Q = {};
  for (const s of STATES) {
    Q[s] = {};
    for (const a of ACTIONS) Q[s][a] = R[s][a] + MDP.gamma * MDP.P[s][a].reduce((acc, p, j) => acc + p * V[STATES[j]], 0);
  }
  return Q;
}

export function valueIteration(R = MDP.R, tol = 1e-9, maxIter = 5000) {
  let V = { Beginner: 0, Ready: 0 };
  let Q = {};
  let it = 0;
  while (it < maxIter) {
    it++;
    Q = bellmanUpdate(V, R);
    const newV = Object.fromEntries(STATES.map((s) => [s, Math.max(...ACTIONS.map((a) => Q[s][a]))]));
    const diff = Math.max(...STATES.map((s) => Math.abs(newV[s] - V[s])));
    V = newV;
    if (diff < tol) break;
  }
  const policy = Object.fromEntries(STATES.map((s) => [s, Q[s][ACTIONS[1]] > Q[s][ACTIONS[0]] ? ACTIONS[1] : ACTIONS[0]]));
  return { V, Q, policy, iterations: it };
}

export const MDP_SOLUTION = valueIteration();

// One Bellman update from V = 0 equals the one-step expected reward R(s, a).
export const oneStepRewards = () => bellmanUpdate({ Beginner: 0, Ready: 0 });

export function beliefWeightedQ(pReady, Q = MDP_SOLUTION.Q) {
  return Object.fromEntries(ACTIONS.map((a) => [a, (1 - pReady) * Q.Beginner[a] + pReady * Q.Ready[a]]));
}

// Policy with a different reward for (Beginner, Next question): the "what if" control.
export function policyWithBeginnerNext(x) {
  const R = { Beginner: { ...MDP.R.Beginner, [NEXT]: x }, Ready: { ...MDP.R.Ready } };
  return valueIteration(R);
}

export function policyThreshold(lo = -5, hi = 5) {
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (policyWithBeginnerNext(mid).policy.Beginner === NEXT) hi = mid; else lo = mid;
  }
  return hi;
}

// ---------------------------------------------------------------
// Evaluation: exact expected reward of a coaching strategy over 5 questions
// ---------------------------------------------------------------
export const STRATEGIES = [
  { id: 'coach', name: 'Üki coach (Viterbi stage + MDP policy)', pick: (obs, acts) => MDP_SOLUTION.policy[STATES[viterbi(obs, acts).path.at(-1)]] },
  { id: 'soft', name: 'Soft coach (filtered belief + MDP Q)', pick: (obs, acts) => {
    const q = beliefWeightedQ(forwardFilter(obs, acts).at(-1).belief[1]);
    return q[NEXT] > q.Review ? NEXT : 'Review';
  } },
  { id: 'bayes', name: 'Bayes only (review below 50%)', pick: (obs) => (bayesSequence(obs.map(Boolean)).at(-1).posterior >= 0.5 ? NEXT : 'Review') },
  { id: 'last', name: 'Last answer only', pick: (obs) => (obs.at(-1) ? NEXT : 'Review') },
  { id: 'next', name: 'Always next question', pick: () => NEXT },
  { id: 'review', name: 'Always review', pick: () => 'Review' },
  { id: 'random', name: 'Random (50/50)', pick: null },
  { id: 'oracle', name: 'Upper bound: true stage known', pick: (_o, _a, s) => MDP_SOLUTION.policy[STATES[s]] },
];

export function expectedOutcome(pick, nQuestions = 5) {
  const { pi, E } = MODEL.hmm;
  const go = (t, s, obs, acts, prob) => {
    if (t === nQuestions) return [0, prob * s];
    let reward = 0, ready = 0;
    for (const o of [0, 1]) {
      const po = prob * E[s][o];
      if (!po) continue;
      const obs2 = [...obs, o];
      const choices = pick ? [[pick(obs2, acts, s), 1]] : ACTIONS.map((a) => [a, 0.5]);
      for (const [a, pa] of choices) {
        reward += po * pa * MDP.R[STATES[s]][a];
        for (const s2 of [0, 1]) {
          const pt = MDP.P[STATES[s]][a][s2];
          if (!pt) continue;
          const [r2, q2] = go(t + 1, s2, obs2, [...acts, a], po * pa * pt);
          reward += r2; ready += q2;
        }
      }
    }
    return [reward, ready];
  };
  const parts = [0, 1].map((s) => go(0, s, [], [], pi[s]));
  return { reward: parts[0][0] + parts[1][0], ready: parts[0][1] + parts[1][1] };
}

let evalCache = null;
export function evaluate() {
  evalCache ??= STRATEGIES.map((st) => ({ id: st.id, name: st.name, ...expectedOutcome(st.pick) }));
  return evalCache;
}

// ---------------------------------------------------------------
// The coach: one call runs all three algorithms on the answers so far.
// actions = coaching actions actually taken after each earlier answer.
// ---------------------------------------------------------------
export function coach(answers, actions = []) {
  const obs = answers.map((c) => (c ? 1 : 0));
  const n = answers.length;
  const acts = actions.slice(0, Math.max(0, n - 1));
  const bayes = bayesSequence(answers);
  const vit = viterbi(obs, acts);
  const filt = forwardFilter(obs, acts);
  const stage = n ? STATES[vit.path[n - 1]] : null;
  const pReady = n ? filt[n - 1].belief[1] : MODEL.hmm.pi[1];
  const action = stage ? MDP_SOLUTION.policy[stage] : null;
  const knowledge = n ? bayes[n - 1].posterior : MODEL.bayes.prior;
  return {
    answers, actions: acts, bayes, knowledge, mastered: knowledge >= MODEL.bayes.mastery,
    viterbi: vit, filter: filt, stage, pReady,
    mdp: MDP_SOLUTION, immediate: oneStepRewards(), action, soft: beliefWeightedQ(pReady),
  };
}
