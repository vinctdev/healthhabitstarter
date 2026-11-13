from app.routers.body_metrics import calculate_bmi


def test_bmi_is_weight_over_height_squared():
    assert calculate_bmi(81.1, 181) == 24.8


def test_bmi_is_rounded_to_one_decimal():
    assert calculate_bmi(70, 175) == 22.9  # 22.857...
