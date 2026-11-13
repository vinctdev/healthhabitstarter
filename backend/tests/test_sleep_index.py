from app.routers.health_data import _compute_sleep_index


def sleep_index(asleep=480, awake=30, deep=90, rem=90, heart_rate=None, period=None):
    return _compute_sleep_index(
        minutes_in_sleep_period=period if period is not None else asleep + awake,
        minutes_asleep=asleep,
        minutes_deep=deep,
        minutes_rem=rem,
        minutes_awake=awake,
        avg_heart_rate=heart_rate,
    )


def test_no_sleep_scores_zero():
    assert sleep_index(asleep=0) == 0
    assert sleep_index(period=0) == 0


def test_formula():
    # 50 + 8 h * 3.5 - 0.5 h awake * 2 + 3 h deep/REM * 2.5 - (55 - 50) bpm * 1.5 = 77
    assert sleep_index(heart_rate=55) == 77


def test_missing_heart_rate_counts_as_50_bpm():
    assert sleep_index(heart_rate=None) == sleep_index(heart_rate=50)


def test_more_sleep_and_lower_heart_rate_score_higher():
    assert sleep_index(asleep=480) > sleep_index(asleep=360)
    assert sleep_index(heart_rate=48) > sleep_index(heart_rate=60)


def test_score_is_clamped_to_0_100():
    assert sleep_index(asleep=900, deep=300, rem=300, heart_rate=40) == 100
    assert sleep_index(asleep=60, awake=300, deep=0, rem=0, heart_rate=110) == 0
