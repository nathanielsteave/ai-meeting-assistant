import { useEffect, useRef, useState, useCallback } from 'react';
import type { WebSocketMessage } from '../types/meeting';

export const useWebSocket = (meetingId: string | null) => {
  const ws = useRef<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [readyState, setReadyState] = useState<number>(WebSocket.CONNECTING);

  useEffect(() => {
    if (!meetingId) return;

    const wsUrl = `ws://localhost:8000/ws/meeting/${meetingId}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setReadyState(WebSocket.OPEN);
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      setReadyState(WebSocket.CLOSED);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setReadyState(WebSocket.CLOSED);
    };

    ws.current.onmessage = (event) => {
      const data: WebSocketMessage = JSON.parse(event.data);
      setLastMessage(data);
    };

    return () => {
      ws.current?.close();
    };
  }, [meetingId]);

  const sendMessage = useCallback((data: ArrayBuffer | string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(data);
    } else {
      console.warn('WebSocket not ready');
    }
  }, []);

  const sendCommand = useCallback((command: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ command }));
    }
  }, []);

  return { sendMessage, sendCommand, lastMessage, readyState };
};