import { useState, useEffect, useCallback, useRef } from 'react';
import type { TranscriptEntry, ActionItem, MeetingSummary } from '../types/meeting';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const useMeetingAPI = (meetingId: string | null) => {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const eventSourceRef = useRef<EventSource | null>(null);

  // Start SSE connection
  useEffect(() => {
    if (!meetingId) {
      setIsConnected(false);
      return;
    }

    // Connect to SSE endpoint
    const es = new EventSource(`${API_URL}/meetings/${meetingId}/events`);
    eventSourceRef.current = es;
    
    es.onopen = () => {
      console.log('SSE connected');
      setIsConnected(true);
    };
    
    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'transcript':
          setTranscript(prev => [...prev, data.data]);
          break;
        case 'ended':
          es.close();
          break;
      }
    };
    
    es.onerror = () => {
      console.log('SSE error, falling back to polling');
      setIsConnected(false);
      es.close();
      // Fallback ke polling
      startPolling(meetingId);
    };
    
    return () => {
      es.close();
    };
  }, [meetingId]);

  // Polling fallback
  const startPolling = (id: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/meetings/${id}/transcript`);
        const data = await response.json();
        setTranscript(data);
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  };

  // Upload audio chunk
  const uploadAudio = useCallback(async (audioData: ArrayBuffer) => {
    if (!meetingId) return;
    
    try {
      const response = await fetch(`${API_URL}/meetings/${meetingId}/audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: audioData,
      });
      
      return await response.json();
    } catch (e) {
      console.error('Upload error:', e);
    }
  }, [meetingId]);

  // Finalize meeting
  const finalizeMeeting = useCallback(async () => {
    if (!meetingId) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch(`${API_URL}/meetings/${meetingId}/finalize`, {
        method: 'POST',
      });
      const data = await response.json();
      setSummary(data);
      return data;
    } catch (e) {
      console.error('Finalize error:', e);
    } finally {
      setIsGenerating(false);
    }
  }, [meetingId]);

  // Create meeting
  const createMeeting = useCallback(async (title: string) => {
    try {
      const response = await fetch(`${API_URL}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      return await response.json();
    } catch (e) {
      console.error('Create error:', e);
      throw e;
    }
  }, []);

  // Fetch action items
  useEffect(() => {
    if (!meetingId) return;
    
    const fetchActionItems = async () => {
      try {
        const response = await fetch(`${API_URL}/meetings/${meetingId}/action-items`);
        const data = await response.json();
        setActionItems(data);
      } catch (e) {
        console.error('Action items error:', e);
      }
    };
    
    fetchActionItems();
    const interval = setInterval(fetchActionItems, 5000);
    return () => clearInterval(interval);
  }, [meetingId]);

  return {
    transcript,
    actionItems,
    summary,
    isConnected,
    isGenerating,
    uploadAudio,
    finalizeMeeting,
    createMeeting,
  };
};