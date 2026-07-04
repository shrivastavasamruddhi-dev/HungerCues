from datetime import UTC, datetime

import pytest

from app.routers.v1.notifications import notification_log

# Override firebase auth for tests is not needed here because conftest provides it globally.


@pytest.fixture(autouse=True)
def clean_notification_log():
    notification_log.clear()
    yield
    notification_log.clear()


@pytest.mark.asyncio
async def test_notification_endpoints(async_client):
    # 1. Initially notification list should be empty
    response = await async_client.get("/api/v1/notifications/recent")
    assert response.status_code == 200
    assert response.json() == []

    # 2. Seed notification log manually to test endpoints
    now_str = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    entry1 = {
        "id": 1,
        "title": "Alert 1",
        "body": "Body 1",
        "sent_at": now_str,
        "type": "feed_gap",
    }
    entry2 = {
        "id": 2,
        "title": "Alert 2",
        "body": "Body 2",
        "sent_at": now_str,
        "type": "sleep_timer",
    }
    notification_log.append(entry1)
    notification_log.append(entry2)

    # 3. Retrieve notifications and check order (most recent first)
    response = await async_client.get("/api/v1/notifications/recent")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    # entry2 was appended last, so it should be first in reverse order
    assert data[0]["id"] == 2
    assert data[1]["id"] == 1

    # 4. Delete one notification (id=1)
    delete_response = await async_client.delete("/api/v1/notifications/1")
    assert delete_response.status_code == 200
    assert delete_response.json() == {"status": "deleted"}

    # 5. Check notification list again
    response = await async_client.get("/api/v1/notifications/recent")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == 2

    # 6. Deleting non-existent notification should return 404
    delete_response = await async_client.delete("/api/v1/notifications/999")
    assert delete_response.status_code == 404

    # 7. Clear all notifications
    clear_response = await async_client.post("/api/v1/notifications/clear")
    assert clear_response.status_code == 200
    assert clear_response.json() == {"status": "cleared"}

    # 8. Verify list is empty
    response = await async_client.get("/api/v1/notifications/recent")
    assert response.status_code == 200
    assert response.json() == []
