# 🤖 AI Meeting Assistant

Real-time meeting transcription with intelligent sentiment analysis and automated action item extraction.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.11+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-00a393.svg)
![React](https://img.shields.io/badge/React-18+-61DAFB.svg)

## ✨ Features

- 🎙️ **Real-time Transcription** - Live speech-to-text with Whisper
- 😊 **Sentiment Analysis** - Track meeting mood and emotions
- ✅ **Action Items** - Auto-extract tasks and assignments
- 📊 **Smart Summary** - AI-generated meeting summaries
- 🌙 **Dark Mode** - Modern UI with theme support
- 📱 **Responsive** - Works on desktop and mobile

## 🚀 Quick Start

### Local Development

```bash
# Clone repository
git clone https://github.com/yourusername/ai-meeting-assistant.git
cd ai-meeting-assistant

# Setup Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Setup Frontend
cd ../frontend
npm install

# Run both (separate terminals)
# Terminal 1: cd backend/app && python main.py
# Terminal 2: cd frontend && npm run dev