import React, { useState, useEffect, useCallback } from 'react';
import { MeetingSetup } from './components/MeetingSetup';
import { Header } from './components/Header';
import { TranscriptView } from './components/TranscriptView';
import { ActionItems } from './components/ActionItems';
import { SentimentChart } from './components/SentimentChart';
import { MeetingSummary } from './components/MeetingSummary';
import { useWebSocket } from './hooks/useWebSocket';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import type { 
  TranscriptEntry, 
  ActionItem, 
  MeetingSummary as SummaryType,
  WebSocketMessage 
} from './types/meeting';

const API_URL = 'http://localhost:8000';

function App() {
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [summary, setSummary] = useState<SummaryType | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [duration, setDuration] = useState('00:00');
  const [startTime, setStartTime] = useState<Date | null>(null);

  const { sendMessage, sendCommand, lastMessage, readyState } = useWebSocket(meetingId);
  const { isRecording, error: recordingError, startRecording, stopRecording } = useAudioRecorder();

  // Duration timer
  useEffect(() => {
    if (!startTime || !meetingId) return;
    
    const interval = setInterval(() => {
      const diff = new Date().getTime() - startTime.getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [startTime, meetingId]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {
      case 'transcript':
        setTranscript(prev => [...prev, lastMessage.data]);
        break;
      
      case 'insights':
        if (lastMessage.data?.action_items) {
          setActionItems(prev => [...prev, ...lastMessage.data.action_items]);
        }
        break;
      
      case 'summary':
        setSummary(lastMessage.data);
        setIsGeneratingSummary(false);
        break;
      
      case 'error':
        console.error('Server error:', lastMessage.message);
        break;
    }
  }, [lastMessage]);

  // Start meeting
  const handleStartMeeting = async (title: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      
      if (!response.ok) throw new Error('Failed to create meeting');
      
      const data = await response.json();
      setMeetingId(data.id);
      setMeetingTitle(title);
      setStartTime(new Date());
      
    } catch (error) {
      alert('Failed to start meeting: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Start recording when WebSocket connected
  useEffect(() => {
    if (meetingId && readyState === WebSocket.OPEN && !isRecording) {
      startRecording((audioData) => {
        sendMessage(audioData);
      });
    }
  }, [meetingId, readyState, isRecording, startRecording, sendMessage]);

  // End meeting
  const handleEndMeeting = useCallback(() => {
    setIsGeneratingSummary(true);
    sendCommand('finalize');
    stopRecording();
  }, [sendCommand, stopRecording]);

  // Reset untuk meeting baru
  const handleNewMeeting = () => {
    setMeetingId(null);
    setMeetingTitle('');
    setTranscript([]);
    setActionItems([]);
    setSummary(null);
    setIsGeneratingSummary(false);
    setDuration('00:00');
    setStartTime(null);
  };

  // Show setup screen
  if (!meetingId) {
    return <MeetingSetup onStart={handleStartMeeting} isLoading={isLoading} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header
        meetingTitle={meetingTitle}
        meetingId={meetingId}
        isRecording={isRecording}
        isConnected={readyState === WebSocket.OPEN}
        isGeneratingSummary={isGeneratingSummary}
        onEndMeeting={handleEndMeeting}
        onNewMeeting={handleNewMeeting}
        hasSummary={!!summary}
        duration={duration}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Transcript */}
          <div className="lg:col-span-7 xl:col-span-8">
            <TranscriptView 
              entries={transcript} 
              isProcessing={isRecording && transcript.length === 0}
            />
          </div>

          {/* Right Column - Analytics */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            <SentimentChart entries={transcript} />
            <ActionItems items={actionItems} />
            <MeetingSummary summary={summary} isGenerating={isGeneratingSummary} />
          </div>
        </div>
      </main>

      {/* Error Toast */}
      {recordingError && (
        <div className="fixed bottom-6 right-6 bg-red-500 text-white px-6 py-4 rounded-xl shadow-lg animate-enter flex items-center gap-3">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span>{recordingError}</span>
        </div>
      )}
    </div>
  );
}

export default App;