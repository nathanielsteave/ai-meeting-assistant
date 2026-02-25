import React from 'react';
import { Mic, MicOff, Square, Loader2, Moon, Sun, Users, Clock } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface HeaderProps {
  meetingTitle: string;
  meetingId: string;
  isRecording: boolean;
  isConnected: boolean;
  isGeneratingSummary: boolean;
  onEndMeeting: () => void;
  onNewMeeting: () => void;
  hasSummary: boolean;
  participantCount?: number;
  duration?: string;
}

export const Header: React.FC<HeaderProps> = ({
  meetingTitle,
  meetingId,
  isRecording,
  isConnected,
  isGeneratingSummary,
  onEndMeeting,
  onNewMeeting,
  hasSummary,
  participantCount = 1,
  duration = "00:00"
}) => {
  const { isDark, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-gray-200/50 dark:border-gray-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Left: Meeting Info */}
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
              isRecording 
                ? 'bg-red-500 shadow-lg shadow-red-500/30 animate-pulse' 
                : 'bg-primary-100 dark:bg-primary-900/30'
            }`}>
              {isRecording ? (
                <MicOff className="w-5 h-5 text-white" />
              ) : (
                <Mic className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              )}
            </div>
            
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">
                {meetingTitle}
              </h1>
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                  {meetingId}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {duration}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Status Indicators */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full animate-pulse ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {isRecording && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-red-600 dark:text-red-400">Recording</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Users className="w-4 h-4" />
              <span>{participantCount}</span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {isDark ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-600" />}
            </button>

            {!hasSummary ? (
              <button
                onClick={onEndMeeting}
                disabled={isGeneratingSummary}
                className="btn-danger flex items-center gap-2 py-2.5"
              >
                {isGeneratingSummary ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">Processing...</span>
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 fill-current" />
                    <span className="hidden sm:inline">End Meeting</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={onNewMeeting}
                className="btn-primary flex items-center gap-2 py-2.5"
              >
                <span>New Meeting</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};