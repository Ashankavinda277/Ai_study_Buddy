from app.services.topic_classification import classify_topic


def test_classification_boundaries():
    assert classify_topic(100) == "Strong"
    assert classify_topic(75) == "Strong"
    assert classify_topic(74.9) == "Average"
    assert classify_topic(50) == "Average"
    assert classify_topic(49.9) == "Weak"
    assert classify_topic(0) == "Weak"
