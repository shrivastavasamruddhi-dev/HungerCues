from datetime import datetime

from pydantic import BaseModel, Field


class FeedingLogInput(BaseModel):
    type: str  # breast, bottle, pumping
    start_time: datetime
    duration_minutes: int
    quantity_ml: float | None = None
    notes: str | None = None


class SleepLogInput(BaseModel):
    sleep_start: datetime
    sleep_end: datetime | None = None
    duration_minutes: int | None = None
    tracking_method: str
    notes: str | None = None


class DiaperLogInput(BaseModel):
    changed_at: datetime
    type: str  # wet, dirty, mixed


class GrowthLogInput(BaseModel):
    recorded_at: datetime
    weight_kg: float | None = None
    height_cm: float | None = None


class AIInsightRequest(BaseModel):
    baby_name: str
    birth_date: str
    gender: str
    feedings: list[FeedingLogInput] = []
    sleep_sessions: list[SleepLogInput] = []


class AIInsightResponse(BaseModel):
    summary: str = Field(description="A friendly, personalized 2-3 sentence overview of the baby's status.")
    feeding_insights: str = Field(description="Analysis of feeding logs, patterns, or gaps.")
    sleep_insights: str = Field(description="Analysis of sleeping cycles, duration, and patterns.")
    recommendations: list[str] = Field(description="List of 3 actionable parenting recommendations based on the logs.")


class AIWeeklySummaryRequest(BaseModel):
    baby_name: str
    birth_date: str
    gender: str
    feedings: list[FeedingLogInput] = []
    sleep_sessions: list[SleepLogInput] = []
    diapers: list[DiaperLogInput] = []
    growth_records: list[GrowthLogInput] = []


class AIWeeklySummaryResponse(BaseModel):
    summary: str = Field(description="A friendly 2-3 sentence overview of the entire week.")
    feeding_insights: str = Field(description="Key feeding patterns, average quantities, and gaps over the week.")
    sleep_insights: str = Field(description="Sleep duration trends, nap schedule consistency, and cycle details.")
    growth_insights: str = Field(description="Weight and height progression over the week.")
    recommendations: list[str] = Field(description="3 scientifically grounded, actionable parenting tips for the week ahead.")


class AIQuestionRequest(BaseModel):
    question: str


class AIQuestionResponse(BaseModel):
    answer: str
