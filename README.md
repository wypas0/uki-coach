# Üki Coach — Adaptive Quiz Coach

Final project for **AI Fundamentals (AIF1303), QAIRU**, topic 01 "Mini Adaptive Quiz Coach".
Author: Коваль Амир (solo project).

**Problem.** A score alone does not tell a student what to do next. After every answer of a short Python quiz the coach decides whether the student should review the idea or move on.

| Step | Algorithm | Question it answers | Output |
|---|---|---|---|
| 1 | **Bayesian inference** | Does the student know this topic? | P(know \| answer), mastery at 85% |
| 2 | **Hidden Markov model + Viterbi** | Which learning stage is the student in? | most likely Beginner / Ready sequence |
| 3 | **Markov decision process** | What should the coach do now? | Review or Next question |

**One model links them.** The HMM moves between stages with exactly the probabilities the MDP uses for *Next question* (T = [[0.8, 0.2], [0.1, 0.9]]). When the coach makes the student review, the next HMM step uses the MDP's *Review* row instead (Beginner → Ready 0.6 instead of 0.2). The stage Viterbi finds is the state the MDP acts on.

## Run it

```bash
python python/quiz_coach.py                # assignment demo: exact sizes from the guidelines
python python/quiz_coach.py --quiz         # answer the five Python questions yourself
python python/quiz_coach.py W W C C C      # full session for any answer pattern (C = correct, W = wrong)
python python/quiz_coach.py --evaluate     # compare the coach with baseline strategies
python python/quiz_coach.py --what-if      # how one reward changes the MDP policy
python python/test_quiz_coach.py           # 8 hand-checked tests
node tests/engine.test.mjs                 # 26 checks: the web app matches the Python reference
```

Web app: open `index.html` through any static server (`python -m http.server`). No build step.

## Model (hypothetical teaching values, clearly labelled)

- **Bayes:** prior P(know) = 0.5; slip P(wrong \| know) = 0.1; guess P(correct \| don't know) = 0.25 (one of four options); mastery 0.85.
- **HMM:** states Beginner, Ready; π = (0.7, 0.3); T = MDP *Next question* row; P(correct \| Beginner) = 0.35, P(correct \| Ready) = 0.75.
- **MDP:** γ = 0.9.

| State, action | P(next = Beginner) | P(next = Ready) | Reward |
|---|---|---|---|
| Beginner, Review | 0.4 | 0.6 | +1 |
| Beginner, Next question | 0.8 | 0.2 | −2 |
| Ready, Review | 0.0 | 1.0 | −1 |
| Ready, Next question | 0.1 | 0.9 | +3 |

### Hand checks

- Bayes, one wrong answer: 0.1·0.5 / (0.1·0.5 + 0.75·0.5) = 0.05 / 0.425 = **0.1176**. One correct answer: 0.45 / 0.575 = 0.7826.
- Viterbi, answers W C C: δ₁ = (0.7·0.65, 0.3·0.25) = (0.455, 0.075); δ₂(B) = 0.455·0.8·0.35 = 0.1274, δ₂(R) = max(0.455·0.2, 0.075·0.9)·0.75 = 0.06825; δ₃(B) = 0.1274·0.8·0.35 = 0.035672, δ₃(R) = max(0.1274·0.2, 0.06825·0.9)·0.75 = 0.046069 → **Beginner → Ready → Ready**.
- MDP, one-step expected reward (one Bellman update from V = 0) in Ready: Review −1, Next question +3 → **Next question**. Value iteration (208 sweeps) agrees: 23.78 vs 27.53.

## Sample input / output: assignment demo

Input: three answers W C C (`python python/quiz_coach.py`).

```text
Üki Coach, assignment demo (topic 01: Mini Adaptive Quiz Coach)
Answers to three Python quiz questions: W C C

1. Bayesian inference: update P(knows the topic) after ONE answer
   Input   prior P(know) = 0.5, answer 1 is wrong
           P(wrong | know) = 0.1, P(wrong | does not know) = 0.75
   Calc    P(know | wrong) = 0.1 x 0.5 / (0.1 x 0.5 + 0.75 x 0.5) = 0.0500 / 0.4250
   Output  P(know) = 0.1176
   Why     the answer is evidence; Bayes weighs how likely it is if the student knows the topic vs is guessing.

2. HMM + Viterbi: most likely Beginner/Ready sequence from THREE answers
   Input   pi = [0.7, 0.3], T = [[0.8, 0.2], [0.1, 0.9]], P(correct | Beginner) = 0.35, P(correct | Ready) = 0.75
   Calc    delta1(wrong): Beginner = 0.455000, Ready = 0.075000
   Calc    delta2(correct): Beginner = 0.127400, Ready = 0.068250   best previous: Beginner <- Beginner, Ready <- Beginner
   Calc    delta3(correct): Beginner = 0.035672, Ready = 0.046069   best previous: Beginner <- Beginner, Ready <- Ready
   Output  most likely sequence = Beginner -> Ready -> Ready
   Why     the stage can change between answers; Viterbi finds the single most likely path through all three.

3. MDP: Review vs Next question in the current stage (Ready)
   Input   2 states, 2 actions, gamma = 0.9
   state, action               P(Beginner)     P(Ready)        reward    
   Beginner, Review            0.4             0.6             1         
   Beginner, Next question     0.8             0.2             -2        
   Ready, Review               0.0             1.0             -1        
   Ready, Next question        0.1             0.9             3         
   Calc    one-step expected reward (Bellman update from V = 0): Review -1.00, Next question +3.00
           second Bellman update: Review 1.70, Next question 5.52
           value iteration (208 sweeps): Review 23.78, Next question 27.53
   Output  recommend Next question
   Why     the MDP compares the reward of each action now plus the discounted value of the stage it leads to.

Expected output
   Knowledge probability   : 0.1176
   Most likely state seq.  : Beginner -> Ready -> Ready
   Recommended action      : Next question
```

## Full session (`W W C C C`, the coach's advice followed)

```text
  [MDP]     stage = Ready: Review 23.78 vs Next question 27.53 -> Next question
Answer 4: CORRECT   (after Next question)
  [Bayes]   P(know) 0.0602 -> 0.1873
  [Viterbi] path = Beginner -> Beginner -> Ready -> Ready   delta = [4.637e-03, 3.593e-02]   P(Ready now) = 0.904
  [MDP]     stage = Ready: Review 23.78 vs Next question 27.53 -> Next question
Answer 5: CORRECT   (after Next question)
  [Bayes]   P(know) 0.1873 -> 0.4534
  [Viterbi] path = Beginner -> Beginner -> Ready -> Ready -> Ready   delta = [1.298e-03, 2.426e-02]   P(Ready now) = 0.914
  [MDP]     stage = Ready: Review 23.78 vs Next question 27.53 -> Next question

Summary
  Knowledge probability : 0.4534 (not yet mastered)
  Most likely stages    : Beginner -> Beginner -> Ready -> Ready -> Ready
  Recommended action    : Next question
```

Bayes stays at 45% because it treats knowledge as fixed, so early mistakes keep counting. The HMM lets the student improve, so it moves to Ready after the first correct answer that follows a review. The two models answer different questions, and that difference is why both are used.

## Results: evaluation

```text
Evaluation: expected result over a 5-question session
Exact expectation over every start stage, answer and transition of the model (no sampling).

  Strategy                                  Total reward      P(Ready at end)   
  Üki coach (Viterbi stage + MDP policy)    7.38              0.763             
  Soft coach (filtered belief + MDP Q)      7.41              0.766             
  Bayes only (review below 50%)             3.16              0.894             
  Last answer only                          6.46              0.848             
  Always next question                      1.58              0.605             
  Always review                             -2.69             0.993             
  Random (50/50)                            2.30              0.859             
  Upper bound: true stage known             11.98             0.856
```

- The coach earns 7.38 of the 11.98 possible if the true stage were known, and beats every simple rule.
- **Reacting to the last answer only** (6.46) is worse, because one answer is noisy: a Ready student still misses 25% of questions. The HMM's memory of earlier answers is what helps.
- **Bayes only** (3.16) keeps reviewing after the student has improved, which is why the stage model is needed.
- The soft coach, which weights Q by the filtered P(Ready), is slightly better again (7.41), a natural next step.
- What-if: the Beginner policy flips from Review to Next question when R(Beginner, Next question) rises above about +1.99.

## Limitations and possible improvements

- Parameters are hand-set; with real student data they could be estimated (Baum–Welch for the HMM, logged outcomes for the MDP).
- Bayes treats answers as independent given fixed knowledge; Bayesian Knowledge Tracing would merge steps 1 and 2.
- Two stages and two actions only; hints, easier questions and per-question difficulty are natural extensions.
- The evaluation uses the model's own assumptions; a real study would compare the strategies with students.

## Documents

- [Technical report](docs/TECHNICAL_REPORT.pdf)
- [Presentation](docs/PRESENTATION.pdf)
- [Demo video, 2 min](docs/demo.mp4)
- [AI usage declaration](AI_USAGE.md)
- [Contribution statement](CONTRIBUTION.md)

