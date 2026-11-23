// Parity test: the browser engine must match the Python reference implementation.
// Run: node tests/engine.test.mjs   (regenerate the reference with python/make_reference.py)
import { readFileSync } from 'node:fs';
import { bayesSequence, viterbi, forwardFilter, valueIteration, coach, evaluate, policyThreshold, MODEL } from '../engine.mjs';

const ref = JSON.parse(readFileSync(new URL('./python_reference.json', import.meta.url)));
const close = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
let failed = 0;
const check = (name, ok) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`); if (!ok) failed++; };

check('HMM transitions are the MDP Next-question row', JSON.stringify(MODEL.hmm.T) === '[[0.8,0.2],[0.1,0.9]]');

for (const pat of ['WCC', 'WWCCC', 'CCCCC', 'WCWWW']) {
  const answers = [...pat].map((c) => c === 'C');
  const obs = answers.map((a) => (a ? 1 : 0));
  // the coach follows its own recommendation after every answer
  const acts = [];
  for (let t = 1; t <= obs.length; t++) acts.push(coach(answers.slice(0, t), acts).action);
  const between = acts.slice(0, -1);
  check(`${pat} bayes`, bayesSequence(answers).every((s, i) => close(s.posterior, ref[pat].k[i])));
  check(`${pat} coaching actions`, JSON.stringify(acts) === JSON.stringify(ref[pat].acts));
  const v = viterbi(obs, between);
  check(`${pat} viterbi path`, JSON.stringify(v.path) === JSON.stringify(ref[pat].path));
  check(`${pat} viterbi delta`, v.delta.at(-1).every((d, j) => close(d, ref[pat].delta[j])));
  check(`${pat} filtered P(Ready)`, close(forwardFilter(obs, between).at(-1).belief[1], ref[pat].pReady));
}

const { delta, path } = viterbi([0, 1, 1]);
check('assignment demo W C C by hand', close(delta[2][0], 0.035672) && close(delta[2][1], 0.04606875) && path.join() === '0,1,1');

const { Q, policy } = valueIteration();
check('mdp Q values', ['Beginner', 'Ready'].every((s) => ['Review', 'Next question'].every((a) => close(Q[s][a], ref.Q[s][a], 1e-6))));
check('mdp policy', policy.Beginner === 'Review' && policy.Ready === 'Next question');
check('what-if threshold', close(policyThreshold(), ref.threshold, 1e-9));
const ev = evaluate();
check('evaluation matches Python', ev.every((r, i) => r.name === ref.evaluation[i][0] && close(r.reward, ref.evaluation[i][1]) && close(r.ready, ref.evaluation[i][2])));
process.exit(failed ? 1 : 0);
