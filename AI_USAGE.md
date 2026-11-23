# AI Usage Declaration

Project: Üki Coach, an adaptive quiz coach (AI Fundamentals, AIF1303, QAIRU)

Author: Коваль Амир

## Tools

| Tool | Used for |
|---|---|
| Claude (Anthropic), November 2026 | Comparing project ideas; drafting the code (`engine.mjs`, `app.mjs`, `python/quiz_coach.py`, tests), the README, the technical report, the presentation and the demo-video script |
| unslop skill by Damir Sokolovsky (@heydamir, CC BY 4.0) | Checklist for the visual design pass of the web app |
| AI text-to-speech | English narration of the two-minute demo video |

## Main prompts (summarised)

- "Propose project options for topic 01 (Mini Adaptive Quiz Coach) that combine Bayes, HMM/Viterbi and MDP."
- "Build the coach: answers must match the assignment exactly (Bayes after one answer, Viterbi on three answers, MDP 2 states × 2 actions)."
- "Review the idea and the implementation, then implement the improvements: one shared model, a Python quiz, an evaluation against baselines, a what-if control."

## What I did and how I verified it

- Chose the topic, the scenario and the final design decisions.
- Checked every model value and the hand calculations myself: Bayes 0.1176, Viterbi δ₃ = 0.035672 / 0.046069, MDP one-step +3 vs −1.
- Ran the test suites: 8 Python unit tests with hand-checked values and 26 checks that the web app returns exactly the same numbers as the Python reference.
- Tested every screen of the web app on desktop and mobile, in light and dark mode.
- Read and can explain all of the code.

All probabilities and rewards are hypothetical teaching values chosen to be checkable by hand; no student data and no trained model were used.
