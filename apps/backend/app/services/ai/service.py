import json
import logging

from app.services.ai.client import GeminiClient
from app.services.ai.schemas import (
    AIInsightRequest,
    AIInsightResponse,
    AIWeeklySummaryRequest,
    AIWeeklySummaryResponse,
)

logger = logging.getLogger(__name__)


class AIService:
    """Service class for orchestrating calls to Gemini to get parenting advice."""

    def __init__(self):
        self.client = GeminiClient()

    async def get_parenting_insights(
        self, request: AIInsightRequest
    ) -> AIInsightResponse:
        """Construct prompt, call Gemini, and parse response into AIInsightResponse."""
        system_instruction = (
            "You are a helpful, professional, and empathetic pediatric nurse and parenting assistant. "
            "Your goal is to analyze baby log data (feeding and sleep logs) and provide actionable, friendly, "
            "and scientifically grounded advice. You must return your response strictly as a JSON object matching "
            "the requested schema structure. Do not include markdown code fence formatting in the raw text response; "
            "output only valid raw JSON."
        )

        # Build log summaries
        feeding_text = ""
        for i, f in enumerate(request.feedings):
            qty = f"{f.quantity_ml}ml" if f.quantity_ml else "N/A"
            feeding_text += f"- Feeding #{i + 1}: Type={f.type}, Start={f.start_time.isoformat()}, Duration={f.duration_minutes}m, Qty={qty}, Notes='{f.notes or ''}'\n"

        sleep_text = ""
        for i, s in enumerate(request.sleep_sessions):
            end_time = s.sleep_end.isoformat() if s.sleep_end else "Ongoing"
            dur = f"{s.duration_minutes}m" if s.duration_minutes else "N/A"
            sleep_text += f"- Sleep #{i + 1}: Start={s.sleep_start.isoformat()}, End={end_time}, Duration={dur}, Method={s.tracking_method}, Notes='{s.notes or ''}'\n"

        prompt = (
            f"Please analyze the following details for baby '{request.baby_name}' "
            f"({request.gender}, born on {request.birth_date}):\n\n"
            f"--- FEEDING LOGS ---\n{feeding_text if feeding_text else 'No feedings recorded.'}\n\n"
            f"--- SLEEP LOGS ---\n{sleep_text if sleep_text else 'No sleep sessions recorded.'}\n\n"
            f"Please output a JSON object with the following fields:\n"
            f"1. 'summary': A friendly, personalized 2-3 sentence overview of the baby's logs.\n"
            f"2. 'feeding_insights': Brief analysis of feeding frequency, quantity, and types.\n"
            f"3. 'sleep_insights': Brief analysis of sleep times, durations, and sleep consistency.\n"
            f"4. 'recommendations': A list of 3 actionable, friendly parenting tips or recommendations.\n"
        )

        try:
            raw_response = await self.client.generate_content(
                prompt, system_instruction
            )

            # Clean up potential markdown fences if present
            cleaned_response = raw_response.strip()
            if cleaned_response.startswith("```"):
                # strip out markdown blocks
                lines = cleaned_response.splitlines()
                if lines[0].startswith("```json") or lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                cleaned_response = "\n".join(lines).strip()

            data = json.loads(cleaned_response)
            return AIInsightResponse(**data)
        except Exception as e:
            logger.error(
                f"Error parsing Gemini response or getting insights: {e}", exc_info=True
            )
            # Return a graceful fallback if anything fails
            return AIInsightResponse(
                summary=f"We processed the logs for {request.baby_name}. They are doing great! Let's continue tracking to find deeper patterns.",
                feeding_insights="Feedings appear to be occurring. Monitor spacing to ensure baby is feeding on demand or following a regular routing.",
                sleep_insights="Ensure baby has a quiet, dark sleep environment to encourage longer sleep cycles.",
                recommendations=[
                    "Maintain the feeding schedule you've started.",
                    "Track sleep using the live sleep timer to get exact nap durations.",
                    "Consult your pediatrician if you notice any sudden changes in feeding/sleeping patterns.",
                ],
            )

    async def ask_baby_question(self, request: AIInsightRequest, question: str) -> str:
        """Ask Gemini a question about the baby, keeping their logs in context."""
        system_instruction = (
            "You are a helpful, professional, and empathetic pediatric nurse and parenting assistant. "
            "Your goal is to answer parents' questions about their baby, keeping the baby's details "
            "and log data in mind. You must return your response strictly as a JSON object with a single "
            "field 'answer' containing your friendly, scientific, and helpful response. Do not include "
            "markdown code fence formatting in the raw text response; output only valid raw JSON."
        )

        # Build log summaries
        feeding_text = ""
        for i, f in enumerate(request.feedings):
            qty = f"{f.quantity_ml}ml" if f.quantity_ml else "N/A"
            feeding_text += f"- Feeding #{i + 1}: Type={f.type}, Start={f.start_time.isoformat()}, Duration={f.duration_minutes}m, Qty={qty}, Notes='{f.notes or ''}'\n"

        sleep_text = ""
        for i, s in enumerate(request.sleep_sessions):
            end_time = s.sleep_end.isoformat() if s.sleep_end else "Ongoing"
            dur = f"{s.duration_minutes}m" if s.duration_minutes else "N/A"
            sleep_text += f"- Sleep #{i + 1}: Start={s.sleep_start.isoformat()}, End={end_time}, Duration={dur}, Method={s.tracking_method}, Notes='{s.notes or ''}'\n"

        prompt = (
            f"Please review the following details for baby '{request.baby_name}' "
            f"({request.gender}, born on {request.birth_date}):\n\n"
            f"--- FEEDING LOGS ---\n{feeding_text if feeding_text else 'No feedings recorded.'}\n\n"
            f"--- SLEEP LOGS ---\n{sleep_text if sleep_text else 'No sleep sessions recorded.'}\n\n"
            f"Parent's Question: {question}\n\n"
            f"Please output a JSON object with a single field 'answer' containing your response."
        )

        try:
            raw_response = await self.client.generate_content(
                prompt, system_instruction
            )
            cleaned_response = raw_response.strip()
            if cleaned_response.startswith("```"):
                lines = cleaned_response.splitlines()
                if lines[0].startswith("```json") or lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                cleaned_response = "\n".join(lines).strip()

            data = json.loads(cleaned_response)
            return data.get("answer", "I could not generate an answer at this time.")
        except Exception as e:
            logger.error(f"Error answering question: {e}", exc_info=True)
            return "I'm sorry, I encountered an error while processing your question. Please try again."

    async def get_weekly_summary(
        self, request: AIWeeklySummaryRequest
    ) -> AIWeeklySummaryResponse:
        """Generate a comprehensive 7-day summary of all baby logs using Gemini."""
        system_instruction = (
            "You are a helpful, professional, and empathetic pediatric nurse and parenting assistant. "
            "Your goal is to analyze a full week of baby log data (feedings, sleep, diapers, and growth) "
            "and return a structured weekly summary with insights and recommendations. "
            "You must return your response strictly as a JSON object matching the requested schema. "
            "Do not include markdown code fence formatting; output only valid raw JSON."
        )

        feeding_text = ""
        for i, f in enumerate(request.feedings):
            qty = f"{f.quantity_ml}ml" if f.quantity_ml else "N/A"
            feeding_text += f"- #{i + 1}: Type={f.type}, Time={f.start_time.strftime('%a %H:%M')}, Duration={f.duration_minutes}m, Qty={qty}\n"

        sleep_text = ""
        for i, s in enumerate(request.sleep_sessions):
            dur = f"{s.duration_minutes}m" if s.duration_minutes else "N/A"
            sleep_text += f"- #{i + 1}: Start={s.sleep_start.strftime('%a %H:%M')}, Duration={dur}, Method={s.tracking_method}\n"

        diaper_text = ""
        for i, d in enumerate(request.diapers):
            diaper_text += (
                f"- #{i + 1}: Type={d.type}, Time={d.changed_at.strftime('%a %H:%M')}\n"
            )

        growth_text = ""
        for i, g in enumerate(request.growth_records):
            w = f"{g.weight_kg:.2f} kg" if g.weight_kg else "N/A"
            h = f"{g.height_cm:.1f} cm" if g.height_cm else "N/A"
            growth_text += f"- #{i + 1}: Date={g.recorded_at.strftime('%a %b %d')}, Weight={w}, Height={h}\n"

        prompt = (
            f"Please generate a comprehensive WEEKLY summary for baby '{request.baby_name}' "
            f"({request.gender}, born {request.birth_date}). "
            f"This covers the last 7 days of logs.\n\n"
            f"--- FEEDINGS ({len(request.feedings)} total) ---\n"
            f"{feeding_text if feeding_text else 'No feedings recorded this week.'}\n\n"
            f"--- SLEEP SESSIONS ({len(request.sleep_sessions)} total) ---\n"
            f"{sleep_text if sleep_text else 'No sleep sessions recorded this week.'}\n\n"
            f"--- DIAPER CHANGES ({len(request.diapers)} total) ---\n"
            f"{diaper_text if diaper_text else 'No diaper changes recorded this week.'}\n\n"
            f"--- GROWTH RECORDS ({len(request.growth_records)} total) ---\n"
            f"{growth_text if growth_text else 'No growth records this week.'}\n\n"
            f"Please output a JSON object with these exact fields:\n"
            f"1. 'summary': A 2-3 sentence friendly overview of the week.\n"
            f"2. 'feeding_insights': Analysis of feeding patterns, quantity trends, and any concerning gaps.\n"
            f"3. 'sleep_insights': Analysis of sleep duration, nap consistency, and cycle completion.\n"
            f"4. 'growth_insights': Analysis of weight/height progression (or note if no data).\n"
            f"5. 'recommendations': A list of exactly 3 actionable, scientifically grounded tips."
        )

        try:
            raw_response = await self.client.generate_content(
                prompt, system_instruction
            )
            cleaned_response = raw_response.strip()
            if cleaned_response.startswith("```"):
                lines = cleaned_response.splitlines()
                if lines[0].startswith("```json") or lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                cleaned_response = "\n".join(lines).strip()

            data = json.loads(cleaned_response)
            return AIWeeklySummaryResponse(**data)
        except Exception as e:
            logger.error(f"Error generating weekly summary: {e}", exc_info=True)
            no_data = len(request.feedings) == 0 and len(request.sleep_sessions) == 0
            return AIWeeklySummaryResponse(
                summary=(
                    f"No activity has been logged for {request.baby_name} this week — start tracking to unlock weekly insights!"
                    if no_data
                    else f"{request.baby_name} had an active week! Keep logging consistently to see deeper patterns."
                ),
                feeding_insights="Continue logging feedings to identify patterns and ensure consistent nutrition.",
                sleep_insights="Track sleep sessions with the live timer to get precise nap and night sleep data.",
                growth_insights="Log weight and height measurements weekly to track growth milestones.",
                recommendations=[
                    "Maintain consistent feeding times to help regulate your baby's internal clock.",
                    "Ensure naps happen in a quiet, darkened environment to maximize sleep quality.",
                    "Consult your pediatrician at the next visit to review growth percentiles.",
                ],
            )
