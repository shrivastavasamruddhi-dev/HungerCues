from datetime import datetime, UTC
import pytest
from app.models.baby import Baby

@pytest.mark.asyncio
async def test_feeding_breast_side(db_session, async_client):
    # 1. Create a dummy baby in the database
    baby = Baby(
        name="Feeding Baby",
        birth_date=datetime(2026, 1, 1).date(),
        gender="Girl",
        family_id="mock-user-uid"
    )
    db_session.add(baby)
    await db_session.commit()
    await db_session.refresh(baby)

    # 2. Test create feeding record with breast_side
    now_str = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    response = await async_client.post(
        "/api/v1/feedings/",
        json={
            "baby_id": baby.id,
            "type": "breast",
            "start_time": now_str,
            "duration_minutes": 15,
            "breast_side": "Left",
            "notes": "Good feeding"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "breast"
    assert data["duration_minutes"] == 15
    assert data["breast_side"] == "Left"
    assert data["notes"] == "Good feeding"
    
    # 3. Test list feedings
    list_response = await async_client.get(f"/api/v1/feedings/baby/{baby.id}")
    assert list_response.status_code == 200
    feedings = list_response.json()
    assert len(feedings) == 1
    assert feedings[0]["breast_side"] == "Left"

