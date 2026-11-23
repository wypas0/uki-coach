# AI Usage Declaration

Course: AI Fundamentals (AIF1303), QAIRU, programme 6B06102 Physical AI

Project: Üki Coach, an adaptive quiz coach (final project, topic 01)

Author: Коваль Амир

Date: November 2026

## 1. Statement

I declare that this project was built with AI-assisted development. The source code and the first drafts of the documents were written by an AI coding agent (Claude, Anthropic). I defined the project, made the design decisions, orchestrated the agent's work, reviewed and tested every result, and take full responsibility for the submitted code, documents and results.

## 2. Author's role

| Area | Responsibilities |
|---|---|
| Problem and scope | Selected topic 01 (Mini Adaptive Quiz Coach) from the course list; defined the scenario of a five-question Python quiz; required that the outputs match the assignment exactly (Bayes after one answer, Viterbi on three answers, an MDP with two states and two actions) |
| System design | Chose the integration of Bayesian inference, an HMM with Viterbi decoding and an MDP through one shared model; approved the model parameters and the coaching policy; decided to evaluate the coach against baseline strategies |
| AI agent orchestration | Set the tasks for the AI coding agent and split the work into stages (model and code, assignment-exact outputs, evaluation, interface, documents, presentation, video); chose the tools and skills the agent used (unslop for design review, humanizer for language review, GitHub for version control, local text-to-speech for the video); reviewed each iteration and accepted, rejected or redirected the changes |
| Review | Reviewed the first version of the project, commissioned a full review of the idea and its implementation, and decided which improvements to adopt |
| Verification | Assignment outputs are checked against the hand calculations in sections 3 to 5 of the technical report and by 34 automated tests (8 unit tests, 26 cross-checks between the Python and JavaScript versions), which the author runs before submission; the application was tested on desktop and mobile |
| Delivery | Managed the GitHub repository and its history, edited the final documentation, prepared the submission package and the project defense |

## 3. AI tools and how they were used

| Tool | Purpose | Extent |
|---|---|---|
| Claude (Anthropic), November 2026, used as an AI coding agent | Proposed project options; wrote the source code (algorithm engine, web interface, Python console version, tests); drafted the README, technical report, presentation and demo-video script; recorded the demo video | Wrote the code and first drafts under the author's orchestration; every result was reviewed and accepted by the author |
| unslop skill (Damir Sokolovsky, CC BY 4.0) | Checklist for the visual design review of the web application | Design review only |
| humanizer skill (blader/humanizer, MIT) | Style review of the English documents | Language editing only |
| Piper text-to-speech (local voice model) | English narration of the demo video | Audio only |

## 4. Integrity of results

All probabilities and rewards in the model are hypothetical teaching values chosen so that they can be checked by hand. No student data was collected and no model was trained. Reported numbers come from the submitted code and can be reproduced with `python python/quiz_coach.py` and `python python/quiz_coach.py --evaluate`.

## 5. Responsibility

I did not write the code by hand. I have read the submitted code and documents, I can explain every algorithm and design decision in them, and I accept responsibility for any errors they contain.

Signed: Коваль Амир
