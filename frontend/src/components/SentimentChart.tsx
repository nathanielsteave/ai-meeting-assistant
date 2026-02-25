import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import type { TranscriptEntry } from '../types/meeting';
import { TrendingUp, TrendingDown, Minus, Activity, Smile, Frown, Meh } from 'lucide-react';

interface SentimentChartProps {
  entries: TranscriptEntry[];
}

export const SentimentChart: React.FC<SentimentChartProps> = ({ entries }) => {
  const data = entries.map((entry, index) => {
    let score = 0;
    
    if (entry.sentiment.overall === 'positive') score += 0.5;
    if (entry.sentiment.overall === 'negative') score -= 0.5;
    
    const emotions = entry.sentiment.emotions;
    score += (emotions.joy || 0) * 0.3;
    score += (emotions.surprise || 0) * 0.1;
    score -= (emotions.anger || 0) * 0.4;
    score -= (emotions.fear || 0) * 0.3;
    score -= (emotions.sadness || 0) * 0.2;
    
    if (entry.sentiment.urgency_detected) score -= 0.3;
    
    return {
      index,
      time: new Date(entry.timestamp * 1000).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      score: Math.max(-1, Math.min(1, score)),
      speaker: entry.speaker,
      text: entry.text.substring(0, 50) + '...',
      sentiment: entry.sentiment.overall
    };
  });

  const getTrend = () => {
    if (data.length < 3) return 'neutral';
    const recent = data.slice(-5);
    const avg = recent.reduce((sum, d) => sum + d.score, 0) / recent.length;
    if (avg > 0.3) return 'positive';
    if (avg < -0.3) return 'negative';
    return 'neutral';
  };

  const trend = getTrend();
  
  const stats = {
    positive: entries.filter(e => e.sentiment.overall === 'positive').length,
    neutral: entries.filter(e => e.sentiment.overall === 'neutral').length,
    negative: entries.filter(e => e.sentiment.overall === 'negative').length,
    urgent: entries.filter(e => e.sentiment.urgency_detected).length
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'positive': return <Smile className="w-5 h-5 text-green-500" />;
      case 'negative': return <Frown className="w-5 h-5 text-red-500" />;
      default: return <Meh className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="card-modern">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Sentiment Analysis</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Real-time mood tracking</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
          {getTrendIcon()}
          <span className={`text-sm font-medium capitalize
            ${trend === 'positive' ? 'text-green-600 dark:text-green-400' :
              trend === 'negative' ? 'text-red-600 dark:text-red-400' :
              'text-gray-600 dark:text-gray-400'}`}>
            {trend}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="p-6">
        <div className="h-[200px] w-full">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="index" hide />
                <YAxis domain={[-1, 1]} hide />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{data.time}</p>
                          <p className="font-medium text-sm text-gray-900 dark:text-white mb-1">{data.speaker}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">{data.text}</p>
                          <div className={`text-xs font-semibold
                            ${data.score > 0 ? 'text-green-600' : data.score < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                            Score: {data.score.toFixed(2)}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={0} stroke="#e5e7eb" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorScore)"
                  animationDuration={500}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#3b82f6' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
              <p className="text-sm">No data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-px bg-gray-100 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700/50">
        <div className="bg-white dark:bg-gray-800 p-4 text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.positive}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Positive</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 text-center">
          <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.neutral}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Neutral</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 text-center">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.negative}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Negative</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 text-center">
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.urgent}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Urgent</p>
        </div>
      </div>
    </div>
  );
};