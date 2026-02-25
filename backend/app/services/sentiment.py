from transformers import pipeline
import torch
from typing import Dict, List, Any
import asyncio

class SentimentAnalyzer:
    _instance = None
    
    def __new__(cls):
        # Singleton pattern untuk load model sekali
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
            
        self.device = 0 if torch.cuda.is_available() else -1
        
        # Load model sentiment
        self.sentiment_pipeline = pipeline(
            "sentiment-analysis",
            model="cardiffnlp/twitter-roberta-base-sentiment-latest",
            device=self.device
        )
        
        # Load model emotion
        self.emotion_pipeline = pipeline(
            "text-classification",
            model="j-hartmann/emotion-english-distilroberta-base",
            top_k=None,
            device=self.device
        )
        
        self._initialized = True
    
    async def analyze(self, text: str) -> Dict[str, Any]:
        """
        Analyze sentiment dan emotion dari text
        """
        # Run in thread pool karena transformers blocking
        loop = asyncio.get_event_loop()
        
        sentiment_result = await loop.run_in_executor(
            None, self._analyze_sentiment, text
        )
        
        emotion_result = await loop.run_in_executor(
            None, self._analyze_emotion, text
        )
        
        return {
            "overall": sentiment_result["label"],
            "confidence": sentiment_result["score"],
            "emotions": emotion_result,
            "meeting_tone": self._get_meeting_tone(emotion_result),
            "urgency_detected": self._detect_urgency(text, emotion_result),
            "agreement_level": self._detect_agreement(text)
        }
    
    def _analyze_sentiment(self, text: str) -> Dict:
        # Truncate jika terlalu panjang
        truncated = text[:512]
        result = self.sentiment_pipeline(truncated)[0]
        return result
    
    def _analyze_emotion(self, text: str) -> Dict[str, float]:
        truncated = text[:512]
        emotions = self.emotion_pipeline(truncated)[0]
        return {item["label"]: item["score"] for item in emotions}
    
    def _get_meeting_tone(self, emotions: Dict[str, float]) -> str:
        dominant = max(emotions, key=emotions.get)
        mapping = {
            "anger": "tense",
            "disgust": "skeptical",
            "fear": "anxious",
            "joy": "positive",
            "neutral": "professional",
            "sadness": "concerned",
            "surprise": "engaged"
        }
        return mapping.get(dominant, "neutral")
    
    def _detect_urgency(self, text: str, emotions: Dict[str, float]) -> bool:
        urgency_words = [
            "urgent", "asap", "immediately", "deadline", "critical",
            "emergency", "blocker", "blocking", "priority"
        ]
        has_words = any(word in text.lower() for word in urgency_words)
        high_stress = emotions.get("fear", 0) > 0.4 or emotions.get("anger", 0) > 0.3
        return has_words or high_stress
    
    def _detect_agreement(self, text: str) -> str:
        agree_words = ["agree", "yes", "sure", "ok", "sounds good", "makes sense"]
        disagree_words = ["disagree", "no", "but", "however", "concern", "problem"]
        
        text_lower = text.lower()
        agree_count = sum(1 for w in agree_words if w in text_lower)
        disagree_count = sum(1 for w in disagree_words if w in text_lower)
        
        if agree_count > disagree_count:
            return "agreement"
        elif disagree_count > agree_count:
            return "disagreement"
        return "neutral"