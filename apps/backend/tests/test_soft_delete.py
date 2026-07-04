from datetime import UTC, datetime

import pytest

from app.models.baby import Baby


@pytest.mark.asyncio
async def test_soft_delete_flow(db_session, async_client):
    # 1. Create a dummy baby in the database
    baby = Baby(
        name="Soft Delete Baby",
        birth_date=datetime(2026, 1, 1).date(),
        gender="Boy",
        family_id="mock-user-uid",
    )
    db_session.add(baby)
    await db_session.commit()
    await db_session.refresh(baby)

    now_str = datetime.now(UTC).isoformat().replace("+00:00", "Z")

    # 2. Create feeding
    f_res = await async_client.post(
        "/api/v1/feedings/",
        json={
            "baby_id": baby.id,
            "type": "bottle",
            "start_time": now_str,
            "duration_minutes": 10,
            "quantity_ml": 100,
            "notes": "Deleted soon",
        },
    )
    assert f_res.status_code == 200
    feeding_id = f_res.json()["id"]

    # 3. Create sleep session
    s_res = await async_client.post(
        "/api/v1/sleep/",
        json={
            "baby_id": baby.id,
            "sleep_start": now_str,
            "sleep_end": now_str,
            "duration_minutes": 30,
            "tracking_method": "manual",
            "notes": "Going to sleep",
        },
    )
    assert s_res.status_code == 200
    _ = s_res.json()["id"]

    # 4. Check active lists
    f_list = await async_client.get(f"/api/v1/feedings/baby/{baby.id}")
    assert len(f_list.json()) == 1

    s_list = await async_client.get(f"/api/v1/sleep/baby/{baby.id}")
    assert len(s_list.json()) == 1

    # 5. Soft-delete feeding
    del_f = await async_client.delete(f"/api/v1/feedings/{feeding_id}")
    assert del_f.status_code == 200
    assert del_f.json()["status"] == "success"

    # 6. Verify feeding is removed from active list, but sleep session remains
    f_list2 = await async_client.get(f"/api/v1/feedings/baby/{baby.id}")
    assert len(f_list2.json()) == 0

    s_list2 = await async_client.get(f"/api/v1/sleep/baby/{baby.id}")
    assert len(s_list2.json()) == 1

    # 7. Check deleted activities list (should show feeding)
    deleted_list = await async_client.get(f"/api/v1/activities/deleted/baby/{baby.id}")
    assert deleted_list.status_code == 200
    del_data = deleted_list.json()
    assert len(del_data["feedings"]) == 1
    assert del_data["feedings"][0]["id"] == feeding_id
    assert len(del_data["sleep"]) == 0

    # 8. Restore feeding
    restore_res = await async_client.post(f"/api/v1/activities/restore/feed/{feeding_id}")
    assert restore_res.status_code == 200
    assert restore_res.json()["status"] == "success"

    # 9. Verify feeding is active again and no longer in deleted activities list
    f_list3 = await async_client.get(f"/api/v1/feedings/baby/{baby.id}")
    assert len(f_list3.json()) == 1

    deleted_list2 = await async_client.get(f"/api/v1/activities/deleted/baby/{baby.id}")
    assert len(deleted_list2.json()["feedings"]) == 0

    # 10. Test invalid kind / non-existent item edge cases
    err_res = await async_client.delete("/api/v1/feedings/99999")
    assert err_res.status_code == 404

    err_res2 = await async_client.post(f"/api/v1/activities/restore/invalid_kind/{feeding_id}")
    assert err_res2.status_code == 400

    err_res3 = await async_client.post("/api/v1/activities/restore/feed/99999")
    assert err_res3.status_code == 404
