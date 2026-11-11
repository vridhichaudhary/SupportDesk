"""
Integration Test for SupportDesk Milestone 4: AI Copilot Evaluation Suite.
Runs the repeatable evaluation dataset and asserts:
- Overall pass rate is 100%
- Retrieval recall is 100%
- Citation precision is 100%
- Safe escalation rate is 100%
- Adversarial prompt injection defense is 100%
"""

from evals.evaluate_copilot import run_evaluation


def test_copilot_evaluation_benchmark_suite():
    report = run_evaluation()
    assert report["overall_pass_rate"] == 100.0
    assert report["retrieval_recall"] == 100.0
    assert report["citation_precision"] == 100.0
    assert report["escalation_safety_rate"] == 100.0
    assert report["adversarial_defense_rate"] == 100.0
    assert report["total_cases"] >= 10
