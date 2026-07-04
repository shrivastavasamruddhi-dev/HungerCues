from datetime import date, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.jobs.notification_scheduler import check_and_send, is_active_hours


def test_is_active_hours_under_four_months():
    # 2 months old baby
    birth_date = date.today() - timedelta(days=60)
    # Under 4 months (60 / 30.4 = 1.97 months) should always return True regardless of hour
    assert is_active_hours(birth_date) is True


def test_is_active_hours_over_four_months():
    # 6 months old baby
    birth_date = date.today() - timedelta(days=183)
    # Calculate what is expected for the current hour
    current_hour = datetime.now().hour
    expected = 8 <= current_hour < 24
    assert is_active_hours(birth_date) == expected


@pytest.mark.asyncio
async def test_check_and_send_no_babies():
    """check_and_send should be a no-op when there are no babies."""
    session = AsyncMock()
    # Simulate empty result set
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    session.execute.return_value = mock_result

    # Should not raise and should not append to notification_log
    from app.routers.v1.notifications import notification_log

    before = len(notification_log)
    await check_and_send(session)
    assert len(notification_log) == before


@pytest.mark.asyncio
async def test_check_and_send_active_sleep_triggers_alert():
    """A baby sleeping for longer than the threshold should trigger a sleep alert."""
    from app.jobs.notification_scheduler import triggered_sleep_milestones
    from app.routers.v1.notifications import notification_log

    # Build a fake baby
    baby = MagicMock()
    baby.id = 9999
    baby.name = "TestBaby"
    baby.birth_date = date.today() - timedelta(
        days=60
    )  # Under 4 months (always active)

    # Build a fake active sleep session that started 100 minutes ago (> 90 min threshold)
    sleep = MagicMock()
    sleep.id = 8888
    sleep.tracking_method = "nap"
    sleep.sleep_end = None
    sleep.sleep_start = datetime.now() - timedelta(minutes=100)  # real datetime

    session = AsyncMock()

    def make_result(items):
        r = MagicMock()
        r.scalars.return_value.all.return_value = items
        r.scalar_one_or_none.return_value = items[0] if items else None
        return r

    # babies query → sleep query → feed query (no feeds)
    session.execute.side_effect = [
        make_result([baby]),
        make_result([sleep]),
        make_result([]),
    ]

    # Reset state and capture pre-test log size
    triggered_sleep_milestones.pop(sleep.id, None)
    notification_log.clear()

    with patch("app.jobs.notification_scheduler.settings") as mock_settings:
        mock_settings.notification_test_mode = False
        await check_and_send(session)

    assert any(n["type"] == "sleep_timer" for n in notification_log)
