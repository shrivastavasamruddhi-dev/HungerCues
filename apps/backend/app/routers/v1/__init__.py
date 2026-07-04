"""
API v1 router.

All versioned endpoints are mounted here under /api/v1/*.

Future routes:
    /api/v1/auth
    /api/v1/families
    /api/v1/babies
    /api/v1/feedings
    /api/v1/sleep
"""

from fastapi import APIRouter

from app.routers.v1.activities import router as activities_router
from app.routers.v1.ai import router as ai_router
from app.routers.v1.auth import router as auth_router
from app.routers.v1.babies import router as babies_router
from app.routers.v1.diapers import router as diapers_router
from app.routers.v1.feedings import router as feedings_router
from app.routers.v1.growth import router as growth_router
from app.routers.v1.milestones import router as milestones_router
from app.routers.v1.notifications import router as notifications_router
from app.routers.v1.sleep import router as sleep_router

router = APIRouter()

router.include_router(auth_router, prefix="/auth", tags=["auth"])
router.include_router(babies_router, prefix="/babies", tags=["babies"])
router.include_router(feedings_router, prefix="/feedings", tags=["feedings"])
router.include_router(sleep_router, prefix="/sleep", tags=["sleep"])
router.include_router(ai_router, prefix="/ai", tags=["ai"])
router.include_router(diapers_router, prefix="/diapers", tags=["diapers"])
router.include_router(growth_router, prefix="/growth", tags=["growth"])
router.include_router(milestones_router, prefix="/milestones", tags=["milestones"])
router.include_router(notifications_router, prefix="/notifications", tags=["notifications"])
router.include_router(activities_router, prefix="/activities", tags=["activities"])
