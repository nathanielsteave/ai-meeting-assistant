import React, { useRef, useEffect } from 'react';
import type { TranscriptEntry } from '../types/meeting';
import { User, Clock, AlertCircle, Sparkles, Volume2 } from 'lucide-react';

interface TranscriptViewProps {
  entries: TranscriptEntry[];
  isProcessing?: boolean;
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({ entries, isProcessing }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  const getSentimentStyles = (sentiment: TranscriptEntry['sentiment']) => {
    if (sentiment.urgency_detected) {
      return {
        border: 'border-l-red-500 dark:border-l-red-400',
        bg: 'bg-red-50/50 dark:bg-red-900/10',
        badge: 'badge-danger'
      };
    }
    
    switch (sentiment.overall) {
      case 'positive':
        return {
          border: 'border-l-green-500 dark:border-l-green-400',
          bg: 'bg-green-50/30 dark:bg-green-900/10',
          badge: 'badge-success'
        };
      case 'negative':
        return {
          border: 'border-l-red-400 dark:border-l-red-400',
          bg: 'bg-red-50/30 dark:bg-red-900/10',
          badge: 'badge-danger'
        };
      default:
        return {
          border: 'border-l-gray-300 dark:border-l-gray-600',
          bg: 'bg-gray-50/30 dark:bg-gray-800/30',
          badge: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
        };
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const getDominantEmotion = (emotions: Record<string, number>) => {
    const sorted = Object.entries(emotions).sort((a, b) => b[1] - a[1]);
    return sorted[0];
  };

  return (
    <div className="card-modern h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <Volume2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Live Transcript</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {entries.length} entries • Real-time
            </p>
          </div>
        </div>
        
        {isProcessing && (
          <div className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>Processing...</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin"
        style={{ maxHeight: 'calc(100vh - 280px)' }}
      >
        {entries.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-20">
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Volume2 className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Waiting for audio...
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
              Start speaking to see real-time transcription with sentiment analysis
            </p>
          </div>
        ) : (
          entries.map((entry, index) => {
            const styles = getSentimentStyles(entry.sentiment);
            const [dominantEmotion, emotionScore] = getDominantEmotion(entry.sentiment.emotions);
            
            return (
              <div
                key={index}
                className={`group relative p-5 rounded-xl border-l-4 ${styles.border} ${styles.bg} 
                           hover:shadow-md transition-all duration-300 animate-enter`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 
                                  flex items-center justify-center text-white text-sm font-medium">
                      {entry.speaker.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">
                        {entry.speaker}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(entry.timestamp)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {entry.sentiment.urgency_detected && (
                      <span className="badge-danger flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Urgent
                      </span>
                    )}
                    <span className={styles.badge}>
                      {entry.sentiment.meeting_tone}
                    </span>
                  </div>
                </div>

                {/* Text */}
                <p className="text-gray-800 dark:text-gray-200 leading-relaxed mb-3">
                  {entry.text}
                </p>

                {/* Emotions Bar */}
                <div className="flex items-center gap-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Emotion:</span>
                    <span className="text-xs font-medium capitalize text-gray-700 dark:text-gray-300">
                      {dominantEmotion} ({(emotionScore * 100).toFixed(0)}%)
                    </span>
                  </div>
                  
                  {/* Mini emotion bars */}
                  <div className="flex-1 flex gap-1 h-1.5">
                    {Object.entries(entry.sentiment.emotions)
                      .filter(([_, score]) => score > 0.1)
                      .slice(0, 3)
                      .map(([emotion, score]) => (
                        <div
                          key={emotion}
                          className="h-full rounded-full bg-primary-500/30 dark:bg-primary-400/30"
                          style={{ width: `${score * 100}%` }}
                          title={`${emotion}: ${(score * 100).toFixed(0)}%`}
                        />
                      ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};