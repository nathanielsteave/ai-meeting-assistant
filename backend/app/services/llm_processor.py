import json
from typing import Dict, List, Any

from config import settings

class LLMProcessor:
    def __init__(self):
        self.mode = settings.LLM_MODE
        
        if self.mode == "openai" and settings.OPENAI_API_KEY:
            import openai
            self.client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            self.model = "gpt-4-turbo-preview"
            print("🤖 Using OpenAI GPT-4")
            
        elif self.mode == "groq" and settings.GROQ_API_KEY:
            from groq import AsyncGroq
            self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)
            self.model = "llama-3.1-70b-versatile"
            print("🤖 Using Groq LLM (FREE)")
            
        else:
            raise ValueError("No LLM provider configured. Set GROQ_API_KEY or OPENAI_API_KEY")
    
    async def extract_insights(self, transcript_chunk: str) -> Dict[str, Any]:
        """Extract action items, decisions, dan key points"""
        
        prompt = f"""Analyze this meeting transcript segment and extract structured information:

TRANSCRIPT:
{transcript_chunk}

Extract and return JSON:
{{
    "action_items": [
        {{
            "task": "specific task description",
            "assignee": "person name or 'TBD'",
            "deadline": "specific date or 'TBD'",
            "priority": "high/medium/low"
        }}
    ],
    "decisions": ["list of decisions made"],
    "key_points": ["important discussion points"],
    "questions": ["unresolved questions"]
}}

Rules:
- Only extract clear action items dengan assignee yang jelas
- Deadline harus spesifik jika disebutkan
- Priority: high = blocking/urgent, medium = normal, low = nice to have"""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system", 
                        "content": "You are a professional meeting assistant. Extract structured insights accurately."
                    },
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.3
            )
            
            result = json.loads(response.choices[0].message.content)
            
            return {
                "action_items": result.get("action_items", []),
                "decisions": result.get("decisions", []),
                "key_points": result.get("key_points", []),
                "questions": result.get("questions", [])
            }
            
        except Exception as e:
            print(f"LLM Error: {e}")
            return {
                "action_items": [],
                "decisions": [],
                "key_points": [],
                "questions": []
            }
    
    async def generate_summary(self, full_transcript: str) -> Dict[str, Any]:
        """Generate comprehensive meeting summary"""
        
        # Truncate jika terlalu panjang
        max_chars = 8000
        if len(full_transcript) > max_chars:
            transcript = full_transcript[:max_chars] + "\n\n[... transcript truncated due to length ...]"
        else:
            transcript = full_transcript
        
        prompt = f"""Create a professional meeting summary from this transcript. Be concise and actionable.

TRANSCRIPT:
{transcript}

Return JSON format:
{{
    "executive_summary": "2-3 sentences overview of the meeting",
    "detailed_summary": ["3-5 bullet points of main discussion topics"],
    "decisions_made": ["list of concrete decisions made"],
    "action_items_summary": ["consolidated action items from the meeting"],
    "sentiment_overview": "overall meeting tone (e.g., collaborative, tense, productive, concerned)",
    "next_steps": ["2-3 recommended follow-up actions"],
    "participants_engagement": "brief description of participation level"
}}

Guidelines:
- Executive summary harus capture essence meeting
- Decisions made harus specific dan actionable
- Sentiment overview harus honest (bisa negative jika ada conflict)
- Next steps harus practical"""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an executive assistant creating concise, accurate meeting summaries. Focus on actionable insights."
                    },
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.4
            )
            
            result = json.loads(response.choices[0].message.content)
            
            # Ensure all fields exist dengan default values
            return {
                "executive_summary": result.get("executive_summary", "Meeting completed"),
                "detailed_summary": result.get("detailed_summary", []),
                "decisions_made": result.get("decisions_made", []),
                "action_items_summary": result.get("action_items_summary", []),
                "sentiment_overview": result.get("sentiment_overview", "neutral"),
                "next_steps": result.get("next_steps", []),
                "participants_engagement": result.get("participants_engagement", "standard participation")
            }
            
        except Exception as e:
            print(f"Summary Error: {e}")
            # Return fallback summary
            return {
                "executive_summary": "Meeting completed. Summary generation encountered an error.",
                "detailed_summary": ["Meeting transcript captured successfully"],
                "decisions_made": [],
                "action_items_summary": [],
                "sentiment_overview": "unknown",
                "next_steps": ["Review transcript manually"],
                "participants_engagement": "unknown"
            }
    
    async def answer_question(self, question: str, meeting_context: str) -> str:
        """Q&A tentang meeting"""
        
        prompt = f"""Based on this meeting transcript, answer the question. 
If the answer is not in the transcript, say "I don't see that information in the meeting."

MEETING TRANSCRIPT:
{meeting_context}

QUESTION: {question}

Answer concisely and cite specific parts of the conversation if relevant."""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "Answer questions based only on the provided meeting context."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            return f"Error processing question: {str(e)}"