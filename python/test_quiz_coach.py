"""Hand-checked test cases. Run: python -m pytest python/  (or python python/test_quiz_coach.py)"""
import math
import quiz_coach as qc


def close(a, b, tol=1e-6):
    return math.isclose(a, b, abs_tol=tol)


def test_bayes_one_answer():
    # correct: 0.9*0.5 / (0.9*0.5 + 0.25*0.5) = 0.45 / 0.575
    assert close(qc.bayes_update(0.5, True)["posterior"], 0.45 / 0.575)
    # wrong: 0.1*0.5 / (0.1*0.5 + 0.75*0.5) = 0.05 / 0.425
    assert close(qc.bayes_update(0.5, False)["posterior"], 0.05 / 0.425)


def test_hmm_transitions_are_the_mdp_next_question_row():
    assert qc.T == [[0.8, 0.2], [0.1, 0.9]]


def test_viterbi_three_answers_by_hand():
    # W C C: delta1 = (0.7*0.65, 0.3*0.25) = (0.455, 0.075)
    # delta2(B) = 0.455*0.8*0.35 = 0.1274 ; delta2(R) = max(0.455*0.2, 0.075*0.9)*0.75 = 0.06825
    # delta3(B) = 0.1274*0.8*0.35 = 0.035672 ; delta3(R) = max(0.1274*0.2, 0.06825*0.9)*0.75 = 0.04606875
    path, delta, _ = qc.viterbi([0, 1, 1])
    assert close(delta[0][0], 0.455) and close(delta[0][1], 0.075)
    assert close(delta[1][0], 0.1274) and close(delta[1][1], 0.06825)
    assert close(delta[2][0], 0.035672) and close(delta[2][1], 0.04606875)
    assert path == [0, 1, 1]  # Beginner, Ready, Ready


def test_review_changes_the_transition():
    # after a Review the Beginner -> Ready probability is 0.6 instead of 0.2
    _, delta, _ = qc.viterbi([0, 1], ["Review"])
    assert close(delta[1][1], max(0.455 * 0.6, 0.075 * 1.0) * 0.75)


def test_mdp_one_step_and_value_iteration():
    q1 = qc.bellman_update({"Beginner": 0.0, "Ready": 0.0})
    assert q1["Beginner"] == {"Review": 1, "Next question": -2}
    assert q1["Ready"] == {"Review": -1, "Next question": 3}
    assert qc.POLICY == {"Beginner": "Review", "Ready": "Next question"}
    assert close(qc.Q_STAR["Beginner"]["Review"], 24.795, 1e-3)
    assert close(qc.Q_STAR["Ready"]["Next question"], 27.534, 1e-3)


def test_assignment_demo_expected_output():
    out = qc.assignment_demo()
    assert close(out["knowledge"], 0.05 / 0.425)
    assert out["path"] == ["Beginner", "Ready", "Ready"]
    assert out["action"] == "Next question"


def test_evaluation_coach_beats_simple_rules():
    rows = {name: reward for name, reward, _ in qc.evaluate()}
    coach = rows["Üki coach (Viterbi stage + MDP policy)"]
    for baseline in ("Bayes only (review below 50%)", "Last answer only",
                     "Always next question", "Always review", "Random (50/50)"):
        assert coach > rows[baseline], baseline
    assert coach < rows["Upper bound: true stage known"]


def test_policy_flip_threshold():
    assert 1.9 < qc.policy_threshold() < 2.0


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("ok ", name)
