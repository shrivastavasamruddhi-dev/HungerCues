from datetime import datetime, UTC
import pytest
from app.models.baby import Baby

@pytest.mark.asyncio
async def test_growth_endpoints(db_session, async_client):
    # 1. Create a dummy baby in the database first
    baby = Baby(
        name="Charlie Test",
        birth_date=datetime(2026, 1, 1).date(),
        gender="Boy",
        family_id="mock-user-uid"
    )
    db_session.add(baby)
    await db_session.commit()
    await db_session.refresh(baby)
    
    # 2. Test create growth record
    now_str = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    response = await async_client.post(
        "/api/v1/growth/",
        json={
            "baby_id": baby.id,
            "recorded_at": now_str,
            "weight_kg": 5.4,
            "height_cm": 58.2,
            "notes": "Healthy progress"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["weight_kg"] == 5.4
    assert data["height_cm"] == 58.2
    assert data["notes"] == "Healthy progress"
    record_id = data["id"]
    
    # Test validation: missing both height and weight
    response_invalid = await async_client.post(
        "/api/v1/growth/",
        json={
            "baby_id": baby.id,
            "recorded_at": now_str,
            "notes": "No metrics"
        }
    )
    assert response_invalid.status_code == 400
    
    # Test validation: negative values
    response_neg = await async_client.post(
        "/api/v1/growth/",
        json={
            "baby_id": baby.id,
            "recorded_at": now_str,
            "weight_kg": -2.0,
            "height_cm": 50.0
        }
    )
    assert response_neg.status_code == 422 # Pydantic validation error

    # 3. Test list growth records
    list_response = await async_client.get(f"/api/v1/growth/baby/{baby.id}")
    assert list_response.status_code == 200
    records = list_response.json()
    assert len(records) >= 1
    assert records[0]["id"] == record_id
    
    # Test non-existent baby
    list_response_404 = await async_client.get("/api/v1/growth/baby/99999")
    assert list_response_404.status_code == 404

