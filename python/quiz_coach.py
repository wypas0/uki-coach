"""Üki Coach — Adaptive Quiz Coach (AI Fundamentals final project, topic 01).

Scenario: a student answers a short Python quiz. Three course algorithms work
toward one goal, deciding how to coach the student:

1. Bayesian inference    -> P(student knows the topic | one answer)
2. HMM + Viterbi         -> most likely Beginner/Ready sequence from three answers
3. MDP                   -> Review vs Next question from a 2-state reward table

One model links them: the HMM's stage transitions are the MDP's
"Next question" row, and the stage Viterbi finds is the state the MDP acts on.
All numbers are hypothetical teaching values (no dataset, no trained model).
The browser app (engine.mjs) implements exactly the same model.

Usage:
    python quiz_coach.py                 # the assignment demo (exact sizes from the guidelines)
    python quiz_coach.py W C C W C       # full 5-question session, C = correct, W = wrong
    python quiz_coach.py --quiz          # answer the five Python questions yourself
    python quiz_coach.py --evaluate      # compare the coach with simple baseline strategies
    python quiz_coach.py --what-if       # how the MDP policy changes with one reward
"""

from __future__ import annotations

import sys

# ---------------------------------------------------------------- model
STATES = ["Beginner", "Ready"]
ACTIONS = ["Review", "Next question"]

# 1. Bayes: one prior, one noisy "sensor" (the answer)
PRIOR, SLIP, GUESS, MASTERY = 0.5, 0.1, 0.25, 0.85

# 3. MDP: P[s][a] = [P(next = Beginner), P(next = Ready)], R[s][a] = reward
GAMMA = 0.9
P = {
    "Beginner": {"Review": [0.4, 0.6], "Next question": [0.8, 0.2]},
    "Ready": {"Review": [0.0, 1.0], "Next question": [0.1, 0.9]},
}
R = {
    "Beginner": {"Review": 1, "Next question": -2},
    "Ready": {"Review": -1, "Next question": 3},
}

# 2. HMM: the stage moves exactly as in the MDP when the quiz just goes on
PI = [0.7, 0.3]
T = [P["Beginner"]["Next question"], P["Ready"]["Next question"]]   # [[0.8, 0.2], [0.1, 0.9]]
E = [[0.65, 0.35],    # Beginner: P(Wrong), P(Correct)
     [0.25, 0.75]]    # Ready:    P(Wrong), P(Correct)


def trans(i: int, j: int, action: str = "Next question") -> float:
    """P(stage j at the next answer | stage i now, coaching action in between)."""
    return P[STATES[i]][action][j]


# ---------------------------------------------------------------- 1. Bayes
def bayes_update(prior: float, correct: bool) -> dict:
    like_know = 1 - SLIP if correct else SLIP
    like_not = GUESS if correct else 1 - GUESS
    joint_know, joint_not = like_know * prior, like_not * (1 - prior)
    evidence = joint_know + joint_not
    return {"prior": prior, "like_know": like_know, "like_not": like_not,
            "joint_know": joint_know, "joint_not": joint_not,
            "evidence": evidence, "posterior": joint_know / evidence}


def bayes_sequence(answers: list[bool]) -> list[dict]:
    steps, p = [], PRIOR
    for a in answers:
        s = bayes_update(p, a)
        steps.append(s)
        p = s["posterior"]
    return steps


# ---------------------------------------------------------------- 2. HMM
def viterbi(obs: list[int], actions: list[str] | None = None):
    """obs: 0 = wrong, 1 = correct. actions[t-1] is the coaching action between
    answer t-1 and answer t (default: the quiz simply goes on)."""
    actions = actions or ["Next question"] * len(obs)
    delta = [[PI[j] * E[j][obs[0]] for j in range(2)]]
    back = [[None, None]]
    for t in range(1, len(obs)):
        row, bp = [], []
        for j in range(2):
            scores = [delta[t - 1][i] * trans(i, j, actions[t - 1]) for i in range(2)]
            best = max(range(2), key=lambda i: scores[i])
            row.append(scores[best] * E[j][obs[t]])
            bp.append(best)
        delta.append(row)
        back.append(bp)
    last = max(range(2), key=lambda j: delta[-1][j])
    path = [last]
    for t in range(len(obs) - 1, 0, -1):
        path.insert(0, back[t][path[0]])
    return path, delta, back


def forward_filter(obs: list[int], actions: list[str] | None = None) -> list[list[float]]:
    actions = actions or ["Next question"] * len(obs)
    beliefs, b = [], None
    for t, o in enumerate(obs):
        pred = PI[:] if t == 0 else [sum(b[i] * trans(i, j, actions[t - 1]) for i in range(2)) for j in range(2)]
        w = [pred[j] * E[j][o] for j in range(2)]
        b = [x / sum(w) for x in w]
        beliefs.append(b)
    return beliefs


# ---------------------------------------------------------------- 3. MDP
def bellman_update(V: dict, rewards: dict = R) -> dict:
    """One Bellman update: Q(s,a) = R(s,a) + gamma * sum_s' P(s'|s,a) V(s')."""
    return {s: {a: rewards[s][a] + GAMMA * sum(p * V[STATES[j]] for j, p in enumerate(P[s][a]))
                for a in ACTIONS} for s in STATES}


def value_iteration(rewards: dict = R, tol: float = 1e-9):
    V = {s: 0.0 for s in STATES}
    for it in range(1, 5001):
        Q = bellman_update(V, rewards)
        new_v = {s: max(Q[s].values()) for s in STATES}
        done = max(abs(new_v[s] - V[s]) for s in STATES) < tol
        V = new_v
        if done:
            break
    policy = {s: max(ACTIONS, key=lambda a: Q[s][a]) for s in STATES}
    return V, Q, policy, it


V_STAR, Q_STAR, POLICY, SWEEPS = value_iteration()


# ---------------------------------------------------------------- evaluation
def _strategies():
    """Each strategy maps (answers so far, actions so far, true stage) -> action."""
    def stage_viterbi(obs, acts, _s):
        return POLICY[STATES[viterbi(obs, acts)[0][-1]]]

    def belief_qmdp(obs, acts, _s):
        b = forward_filter(obs, acts)[-1]
        return max(ACTIONS, key=lambda a: b[0] * Q_STAR["Beginner"][a] + b[1] * Q_STAR["Ready"][a])

    def last_answer(obs, _a, _s):
        return "Next question" if obs[-1] else "Review"

    def bayes_only(obs, _a, _s):
        k = bayes_sequence([bool(o) for o in obs])[-1]["posterior"]
        return "Next question" if k >= 0.5 else "Review"

    return [
        ("Üki coach (Viterbi stage + MDP policy)", stage_viterbi),
        ("Soft coach (filtered belief + MDP Q)", belief_qmdp),
        ("Bayes only (review below 50%)", bayes_only),
        ("Last answer only", last_answer),
        ("Always next question", lambda *_: "Next question"),
        ("Always review", lambda *_: "Review"),
        ("Random (50/50)", None),
        ("Upper bound: true stage known", lambda _o, _a, s: POLICY[STATES[s]]),
    ]


def expected_outcome(strategy, n_questions: int = 5) -> tuple[float, float]:
    """Exact expected total reward and P(Ready at the end), by enumerating every
    possible start stage, answer and transition (no random sampling)."""
    def go(t, s, obs, acts, prob):
        if t == n_questions:
            return 0.0, prob * s
        reward, ready = 0.0, 0.0
        for o in (0, 1):
            po = prob * E[s][o]
            if po == 0:
                continue
            obs2 = obs + [o]
            choices = [(a, 0.5) for a in ACTIONS] if strategy is None else [(strategy(obs2, acts, s), 1.0)]
            for a, pa in choices:
                reward += po * pa * R[STATES[s]][a]
                for s2 in (0, 1):
                    pt = P[STATES[s]][a][s2]
                    if pt:
                        r2, q2 = go(t + 1, s2, obs2, acts + [a], po * pa * pt)
                        reward += r2
                        ready += q2
        return reward, ready
    total = [go(0, s, [], [], PI[s]) for s in (0, 1)]
    return sum(x[0] for x in total), sum(x[1] for x in total)


def evaluate() -> list[tuple[str, float, float]]:
    return [(name, *expected_outcome(fn)) for name, fn in _strategies()]


def policy_threshold(lo: float = -5, hi: float = 5) -> float:
    """Smallest R(Beginner, Next question) at which the Beginner policy flips to Next question."""
    def flips(x):
        r = {s: dict(R[s]) for s in STATES}
        r["Beginner"]["Next question"] = x
        return value_iteration(r)[2]["Beginner"] == "Next question"
    for _ in range(60):
        mid = (lo + hi) / 2
        lo, hi = (lo, mid) if flips(mid) else (mid, hi)
    return hi


# ---------------------------------------------------------------- console output
def fmt_row(cells, widths):
    return "  ".join(str(c).ljust(w) for c, w in zip(cells, widths))


def assignment_demo(answers=(False, True, True)) -> dict:
    """Exactly the sizes in the guidelines: Bayes after one answer, Viterbi on three
    answers, MDP with 2 states / 2 actions and a one-step comparison."""
    word = lambda a: "correct" if a else "wrong"
    obs = [1 if a else 0 for a in answers]
    print("Üki Coach, assignment demo (topic 01: Mini Adaptive Quiz Coach)")
    print("Answers to three Python quiz questions:", " ".join("C" if a else "W" for a in answers))
    print()

    print("1. Bayesian inference: update P(knows the topic) after ONE answer")
    s = bayes_update(PRIOR, answers[0])
    w = word(answers[0])
    print(f"   Input   prior P(know) = {PRIOR}, answer 1 is {w}")
    print(f"           P({w} | know) = {s['like_know']}, P({w} | does not know) = {s['like_not']}")
    print(f"   Calc    P(know | {w}) = {s['like_know']} x {PRIOR} / ({s['like_know']} x {PRIOR} + {s['like_not']} x {1 - PRIOR})"
          f" = {s['joint_know']:.4f} / {s['evidence']:.4f}")
    print(f"   Output  P(know) = {s['posterior']:.4f}")
    print("   Why     the answer is evidence; Bayes weighs how likely it is if the student knows the topic vs is guessing.")
    print()

    print("2. HMM + Viterbi: most likely Beginner/Ready sequence from THREE answers")
    path, delta, back = viterbi(obs)
    print(f"   Input   pi = {PI}, T = {T}, P(correct | Beginner) = {E[0][1]}, P(correct | Ready) = {E[1][1]}")
    for t in range(len(obs)):
        bp = "" if t == 0 else f"   best previous: Beginner <- {STATES[back[t][0]]}, Ready <- {STATES[back[t][1]]}"
        print(f"   Calc    delta{t + 1}({word(answers[t])}): Beginner = {delta[t][0]:.6f}, Ready = {delta[t][1]:.6f}{bp}")
    print(f"   Output  most likely sequence = {' -> '.join(STATES[x] for x in path)}")
    print("   Why     the stage can change between answers; Viterbi finds the single most likely path through all three.")
    print()

    stage = STATES[path[-1]]
    print(f"3. MDP: Review vs Next question in the current stage ({stage})")
    print(f"   Input   2 states, 2 actions, gamma = {GAMMA}")
    widths = [26, 14, 14, 10]
    print("   " + fmt_row(["state, action", "P(Beginner)", "P(Ready)", "reward"], widths))
    for st in STATES:
        for a in ACTIONS:
            print("   " + fmt_row([f"{st}, {a}", P[st][a][0], P[st][a][1], R[st][a]], widths))
    q1 = bellman_update({s_: 0.0 for s_ in STATES})
    q2 = bellman_update({s_: max(q1[s_].values()) for s_ in STATES})
    print(f"   Calc    one-step expected reward (Bellman update from V = 0): "
          f"Review {q1[stage]['Review']:+.2f}, Next question {q1[stage]['Next question']:+.2f}")
    print(f"           second Bellman update: Review {q2[stage]['Review']:.2f}, Next question {q2[stage]['Next question']:.2f}")
    print(f"           value iteration ({SWEEPS} sweeps): Review {Q_STAR[stage]['Review']:.2f}, "
          f"Next question {Q_STAR[stage]['Next question']:.2f}")
    action = max(ACTIONS, key=lambda a: q1[stage][a])
    assert action == POLICY[stage], "one-step and long-term answers agree for this model"
    print(f"   Output  recommend {action}")
    print("   Why     the MDP compares the reward of each action now plus the discounted value of the stage it leads to.")
    print()

    print("Expected output")
    print(f"   Knowledge probability   : {s['posterior']:.4f}")
    print(f"   Most likely state seq.  : {' -> '.join(STATES[x] for x in path)}")
    print(f"   Recommended action      : {action}")
    return {"knowledge": s["posterior"], "path": [STATES[x] for x in path], "action": action}


def session(answers: list[bool]) -> dict:
    """Full 5-question session: the coach acts after every answer and the
    action it takes changes the stage transition used by the HMM."""
    obs, acts, p = [1 if a else 0 for a in answers], [], PRIOR
    print(f"Full session, MDP solved by value iteration in {SWEEPS} sweeps (gamma = {GAMMA})")
    for s in STATES:
        print(f"  Q({s}, Review) = {Q_STAR[s]['Review']:.3f}   Q({s}, Next question) = {Q_STAR[s]['Next question']:.3f}"
              f"   -> policy: {POLICY[s]}")
    print()
    for t, correct in enumerate(answers, start=1):
        step = bayes_update(p, correct)
        p = step["posterior"]
        path, delta, _ = viterbi(obs[:t], acts)
        belief = forward_filter(obs[:t], acts)[-1]
        stage = STATES[path[-1]]
        action = POLICY[stage]
        word = "correct" if correct else "wrong"
        print(f"Answer {t}: {word.upper()}" + (f"   (after {acts[-1]})" if acts else ""))
        print(f"  [Bayes]   P(know) {step['prior']:.4f} -> {p:.4f}")
        print(f"  [Viterbi] path = {' -> '.join(STATES[x] for x in path)}"
              f"   delta = [{delta[-1][0]:.3e}, {delta[-1][1]:.3e}]   P(Ready now) = {belief[1]:.3f}")
        print(f"  [MDP]     stage = {stage}: Review {Q_STAR[stage]['Review']:.2f} vs "
              f"Next question {Q_STAR[stage]['Next question']:.2f} -> {action}")
        acts.append(action)
    path, _, _ = viterbi(obs, acts[:-1])
    result = {"knowledge": p, "mastered": p >= MASTERY, "path": [STATES[x] for x in path], "action": acts[-1]}
    print()
    print("Summary")
    print(f"  Knowledge probability : {p:.4f} ({'mastered' if result['mastered'] else 'not yet mastered'})")
    print(f"  Most likely stages    : {' -> '.join(result['path'])}")
    print(f"  Recommended action    : {result['action']}")
    return result


def print_evaluation():
    print("Evaluation: expected result over a 5-question session")
    print("Exact expectation over every start stage, answer and transition of the model (no sampling).")
    print()
    rows = evaluate()
    widths = [40, 16, 18]
    print("  " + fmt_row(["Strategy", "Total reward", "P(Ready at end)"], widths))
    for name, reward, ready in rows:
        print("  " + fmt_row([name, f"{reward:.2f}", f"{ready:.3f}"], widths))
    return rows


def print_what_if():
    th = policy_threshold()
    print("What if: reward for giving a Beginner a new question, R(Beginner, Next question)")
    print(f"  Policy in Beginner flips from Review to Next question at R = {th:.3f}")
    for x in (-2, -1, 0, 1, 2, 3):
        r = {s: dict(R[s]) for s in STATES}
        r["Beginner"]["Next question"] = x
        print(f"  R = {x:+d}: Beginner -> {value_iteration(r)[2]['Beginner']}")


PYTHON_QUIZ = [  # (question, options, index of the correct option); same bank as questions.mjs
    ("What does print(len([1, [2, 3], 4])) show?", ["4", "3", "2", "An error"], 1),
    ("x = [1, 2, 3]; y = x; y.append(4). What is x now?", ["[1, 2, 3]", "[4, 1, 2, 3]", "[1, 2, 3, 4]", "An error"], 2),
    ("What does print(7 // 2, 7 % 2) show?", ["3.5 1", "3 1", "4 1", "3 0"], 1),
    ('What is "python"[1:4]?', ['"pyt"', '"ytho"', '"yth"', '"pyth"'], 2),
    ("What does print(bool([]), bool([0])) show?", ["False False", "True False", "False True", "True True"], 2),
]


def interactive_quiz() -> dict:
    """Ask the five Python questions in the console, then run the full session."""
    answers = []
    for i, (q, opts, ans) in enumerate(PYTHON_QUIZ, start=1):
        print(f"\nQ{i}. {q}")
        for k, o in zip("ABCD", opts):
            print(f"   {k}) {o}")
        pick = ""
        while pick not in ("A", "B", "C", "D"):
            pick = input("Your answer (A-D): ").strip().upper()
        answers.append("ABCD".index(pick) == ans)
        print("   correct" if answers[-1] else f"   wrong, the answer is {'ABCD'[ans]}")
    print()
    return session(answers)


def parse(argv: list[str]) -> list[bool]:
    seq = [a.upper() for a in argv]
    if any(a not in ("C", "W") for a in seq):
        raise SystemExit("Use C for a correct answer and W for a wrong one, e.g.: python quiz_coach.py W C C W C")
    return [a == "C" for a in seq]


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        assignment_demo()
    elif args[0] == "--evaluate":
        print_evaluation()
    elif args[0] == "--what-if":
        print_what_if()
    elif args[0] == "--quiz":
        interactive_quiz()
    else:
        session(parse(args))
