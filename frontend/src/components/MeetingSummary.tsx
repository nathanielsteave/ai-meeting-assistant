import React from 'react';
import type { MeetingSummary as SummaryType } from '../types/meeting';
import { FileText, CheckCircle, ArrowRight, Users, MessageSquare, Download, Sparkles, Lightbulb, Target } from 'lucide-react';

interface MeetingSummaryProps {
  summary: SummaryType | null;
  isGenerating: boolean;
}

export const MeetingSummary: React.FC<MeetingSummaryProps> = ({ summary, isGenerating }) => {
  if (isGenerating) {
    return (
      <div className="card-modern p-8">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center animate-pulse">
              <Sparkles className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Generating Summary...
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm">
            Our AI is analyzing the conversation to extract key insights and action items
          </p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="card-modern p-8">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Meeting in Progress</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Summary will be generated when the meeting ends
          </p>
        </div>
      </div>
    );
  }

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-summary-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card-modern overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700/50 bg-gradient-to-r from-primary-50/50 to-purple-50/50 dark:from-primary-900/20 dark:to-purple-900/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Meeting Summary</h3>
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Generated successfully
            </p>
          </div>
        </div>
        
        <button
          onClick={handleDownload}
          className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
          title="Download JSON"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Executive Summary */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Executive Summary</h4>
          </div>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {summary.executive_summary}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
              <Users className="w-4 h-4" />
              <span className="text-sm">Engagement</span>
            </div>
            <p className="font-medium text-gray-900 dark:text-white">
              {summary.participants_engagement}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm">Tone</span>
            </div>
            <p className="font-medium text-gray-900 dark:text-white">
              {summary.sentiment_overview}
            </p>
          </div>
        </div>

        {/* Decisions */}
        {summary.decisions_made?.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Key Decisions
            </h4>
            <ul className="space-y-2">
              {summary.decisions_made.map((decision, idx) => (
                <li key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-800">
                  <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 text-xs font-medium text-green-600 dark:text-green-400">
                    {idx + 1}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300 text-sm">{decision}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Discussion Points */}
        {summary.detailed_summary?.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Discussion Points</h4>
            <ul className="space-y-2">
              {summary.detailed_summary.slice(0, 4).map((point, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2 flex-shrink-0" />
                  <span className="line-clamp-2">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

                {/* Next Steps */}
        {summary.next_steps?.length > 0 && (
          <div className="p-5 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-100 dark:border-purple-800">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-600" />
              Recommended Next Steps
            </h4>
            <ul className="space-y-2">
              {summary.next_steps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <ArrowRight className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};