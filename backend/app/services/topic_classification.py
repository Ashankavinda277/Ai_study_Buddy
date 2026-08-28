"""Weak-topic identification (Feature 11): classifying a topic's running
accuracy into Strong/Average/Weak. A pure function, same reasoning as
grading.performance_level — trivial to unit test, no database involved.
"""


def classify_topic(accuracy: float) -> str:
    if accuracy >= 75:
        return "Strong"
    if accuracy >= 50:
        return "Average"
    return "Weak"
