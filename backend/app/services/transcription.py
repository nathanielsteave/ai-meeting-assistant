import io
import wave
import tempfile
import os
from typing import Dict, Optional
import numpy as np

from config import settings

class WhisperTranscriber:
    def __init__(self):
        self.mode = settings.TRANSCRIPTION_MODE
        self.sample_rate = 16000
        
        if self.mode == "openai" and settings.OPENAI_API_KEY:
            import openai
            self.client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            print("🎤 Using OpenAI Whisper API")
            
        elif self.mode == "groq" and settings.GROQ_API_KEY:
            from groq import AsyncGroq
            self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)
            print("🎤 Using Groq Whisper (FREE)")
            
        else:
            print("🎤 Loading Local Whisper (base model)...")
            from faster_whisper import WhisperModel
            self.local_model = WhisperModel("base", device="cpu", compute_type="int8")
            print("✅ Local Whisper loaded")
    
    async def transcribe_chunk(self, audio_bytes: bytes) -> Dict:
        """Transcribe dengan provider yang tersedia"""
        
        if len(audio_bytes) < 1000:  # Skip chunks yang terlalu kecil
            return {"text": "", "start": 0, "end": 0, "speaker": "Unknown", "segments": []}
        
        # Convert ke WAV
        wav_buffer = io.BytesIO()
        with wave.open(wav_buffer, 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(self.sample_rate)
            wav_file.writeframes(audio_bytes)
        
        wav_buffer.seek(0)
        
        # Simpan ke temp file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(wav_buffer.read())
            tmp_path = tmp.name
        
        try:
            if self.mode == "openai" and settings.OPENAI_API_KEY:
                return await self._transcribe_openai(tmp_path)
            elif self.mode == "groq" and settings.GROQ_API_KEY:
                return await self._transcribe_groq(tmp_path)
            else:
                return await self._transcribe_local(tmp_path)
                
        except Exception as e:
            print(f"Transcription error: {e}")
            return {"text": "", "start": 0, "end": 0, "speaker": "Unknown", "segments": [], "error": str(e)}
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
    
    async def _transcribe_openai(self, audio_path: str) -> Dict:
        """OpenAI Whisper API"""
        with open(audio_path, "rb") as audio_file:
            response = await self.client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json",
                timestamp_granularities=["segment"]
            )
        
        return self._format_response(response)
    
    async def _transcribe_groq(self, audio_path: str) -> Dict:
        """Groq Whisper (Gratis & Cepat)"""
        try:
            with open(audio_path, "rb") as audio_file:
                response = await self.client.audio.transcriptions.create(
                    model="whisper-large-v3",
                    file=audio_file,
                    response_format="verbose_json"
                )
            
            # Groq return dict, bukan object
            if isinstance(response, dict):
                return self._format_dict_response(response)
            else:
                return self._format_response(response)
                
        except Exception as e:
            print(f"Groq error: {e}")
            raise
    
    async def _transcribe_local(self, audio_path: str) -> Dict:
        """Local Whisper (Gratis tapi lebih lambat)"""
        segments, info = self.local_model.transcribe(
            audio_path,
            beam_size=5,
            best_of=5,
            condition_on_previous_text=True
        )
        
        # Convert ke format yang sama
        text_parts = []
        segment_data = []
        
        for segment in segments:
            text_parts.append(segment.text)
            segment_data.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text
            })
        
        return {
            "text": " ".join(text_parts),
            "start": segment_data[0]["start"] if segment_data else 0,
            "end": segment_data[-1]["end"] if segment_data else 0,
            "speaker": "Speaker A",
            "segments": segment_data
        }
    
    def _format_response(self, response) -> Dict:
        """Format response dari API object ke format standar"""
        try:
            segments = []
            if hasattr(response, 'segments') and response.segments:
                for seg in response.segments:
                    if hasattr(seg, 'start'):
                        segments.append({
                            "start": seg.start,
                            "end": seg.end,
                            "text": seg.text
                        })
                    elif isinstance(seg, dict):
                        segments.append({
                            "start": seg.get('start', 0),
                            "end": seg.get('end', 0),
                            "text": seg.get('text', '')
                        })
            
            # Get text
            text = ""
            if hasattr(response, 'text'):
                text = response.text
            elif isinstance(response, dict):
                text = response.get('text', '')
            
            # Get timestamps
            start = 0
            end = 0
            if segments:
                start = segments[0]["start"]
                end = segments[-1]["end"]
            elif hasattr(response, 'start'):
                start = response.start
                end = response.end
            
            return {
                "text": text,
                "start": start,
                "end": end,
                "speaker": "Speaker A",
                "segments": segments
            }
        except Exception as e:
            print(f"Format response error: {e}")
            # Fallback
            return {
                "text": str(response.text if hasattr(response, 'text') else ''),
                "start": 0,
                "end": 0,
                "speaker": "Speaker A",
                "segments": []
            }
    
    def _format_dict_response(self, response: dict) -> Dict:
        """Format response dari Groq yang return dict"""
        segments_data = response.get('segments', [])
        segments = []
        
        for seg in segments_data:
            if isinstance(seg, dict):
                segments.append({
                    "start": seg.get('start', 0),
                    "end": seg.get('end', 0),
                    "text": seg.get('text', '')
                })
        
        text = response.get('text', '')
        
        return {
            "text": text,
            "start": segments[0]["start"] if segments else 0,
            "end": segments[-1]["end"] if segments else 0,
            "speaker": "Speaker A",
            "segments": segments
        }