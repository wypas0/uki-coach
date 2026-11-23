"""Regenerate tests/python_reference.json, which the JS parity test compares against."""
import json
from pathlib import Path

import quiz_coach as qc

ref = {}
for pat in ["WCC", "WWCCC", "CCCCC", "WCWWW"]:
    ans = [c == "C" for c in pat]
    obs = [int(a) for a in ans]
    acts = []
    for t in range(1, len(obs) + 1):
        p, _, _ = qc.viterbi(obs[:t], acts)
        acts.append(qc.POLICY[qc.STATES[p[-1]]])
    path, delta, _ = qc.viterbi(obs, acts[:-1])
    ref[pat] = {"k": [s["posterior"] for s in qc.bayes_sequence(ans)], "acts": acts, "path": path,
                "pReady": qc.forward_filter(obs, acts[:-1])[-1][1], "delta": delta[-1]}
ref["Q"] = qc.Q_STAR
ref["threshold"] = qc.policy_threshold()
ref["evaluation"] = [[n, r, q] for n, r, q in qc.evaluate()]
out = Path(__file__).resolve().parent.parent / "tests" / "python_reference.json"
out.write_text(json.dumps(ref, indent=1, ensure_ascii=False))
print("wrote", out)
