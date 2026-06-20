"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BasicEssay, YouTuberEssay } from "@/lib/types";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addDays, subDays } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useState, useEffect } from "react";

type FirestoreTimestampLike = {
  toDate: () => Date;
};

interface SubmissionCalendarProps {
  essays: (BasicEssay | YouTuberEssay)[];
}

export function SubmissionCalendar({ essays }: SubmissionCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    // 日付の有効性をチェック
    if (isNaN(now.getTime())) {
      console.warn('Invalid initial date, using fallback');
      return new Date(2024, 0, 1); // フォールバック日付
    }
    return now;
  });
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [videoTitles, setVideoTitles] = useState<Record<string, string>>({});

  // 動画タイトルを取得
  useEffect(() => {
    const fetchVideoTitles = async () => {
      const youTuberEssays = essays.filter(essay => 'videoId' in essay) as YouTuberEssay[];
      const uniqueVideoIds = [...new Set(youTuberEssays.map(essay => essay.videoId))];
      
      const titles: Record<string, string> = {};
      for (const videoId of uniqueVideoIds) {
        try {
          const response = await fetch(`/api/youtube/video-info?videoId=${videoId}`);
          const data = await response.json();
          if (response.ok && data.video) {
            titles[videoId] = data.video.title;
          }
        } catch (error) {
          console.error('Error fetching video title:', error);
          titles[videoId] = `動画ID: ${videoId}`;
        }
      }
      setVideoTitles(titles);
    };
    
    fetchVideoTitles();
  }, [essays]);

  // 日付変換のヘルパー関数
  const parseDate = (dateValue: Date | FirestoreTimestampLike | string | number | null | undefined): Date | null => {
    if (!dateValue) return null;
    
    let date: Date;
    if (dateValue instanceof Date) {
      date = dateValue;
    } else if (dateValue && typeof dateValue === 'object' && 'toDate' in dateValue) {
      // Firebase Timestamp
      date = (dateValue as FirestoreTimestampLike).toDate();
    } else {
      date = new Date(dateValue);
    }
    
    // 有効な日付かチェック
    if (isNaN(date.getTime())) {
      console.warn('Invalid date value:', dateValue);
      return null;
    }
    
    return date;
  };

  // 提出日を日付文字列のセットとして作成
  const submissionDates = new Set(
    essays
      .map(essay => {
        const date = parseDate(essay.submittedAt);
        return date ? format(date, 'yyyy-MM-dd') : null;
      })
      .filter(Boolean)
  );

  void submissionDates;

  // 各日付のエッセイ情報を取得
  const getEssaysForDate = (date: Date) => {
    if (!date || isNaN(date.getTime())) {
      return [];
    }
    
    const dayEssays = essays.filter(essay => {
      const essayDate = parseDate(essay.submittedAt);
      return essayDate ? isSameDay(essayDate, date) : false;
    });
    
    // 未読のエッセイを上にソート
    return dayEssays.sort((a, b) => {
      const aUnread = a.status === 'feedback_completed' && !a.feedbackRead;
      const bUnread = b.status === 'feedback_completed' && !b.feedbackRead;
      
      // 未読のエッセイを上に配置
      if (aUnread && !bUnread) return -1;
      if (!aUnread && bUnread) return 1;
      
      // 同じ未読状態の場合は提出時間順（新しい順）
      const aDate = parseDate(a.submittedAt);
      const bDate = parseDate(b.submittedAt);
      if (aDate && bDate) {
        return bDate.getTime() - aDate.getTime();
      }
      
      return 0;
    });
  };

  // 月の統計を計算
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const monthStats = {
    totalSubmissions: essays.filter(essay => {
      const essayDate = parseDate(essay.submittedAt);
      return essayDate ? (essayDate >= monthStart && essayDate <= monthEnd) : false;
    }).length,
    daysWithSubmissions: monthDays.filter(day => {
      const dayEssays = getEssaysForDate(day);
      return dayEssays.length > 0;
    }).length,
    unreadFeedback: essays.filter(essay => {
      const essayDate = parseDate(essay.submittedAt);
      return essayDate ? (
        essayDate >= monthStart && 
        essayDate <= monthEnd && 
        (essay.status === 'feedback_completed' && !essay.feedbackRead)
      ) : false;
    }).length
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      
      // 日付の有効性をチェック
      if (isNaN(newDate.getTime())) {
        console.warn('Invalid date created during month navigation:', newDate);
        return prev; // 元の日付を返す
      }
      
      return newDate;
    });
  };

  return (
    <div className="w-full">
      <Card className="w-full border border-gray-200 bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-5 h-5 text-gray-600" />
              <CardTitle className="text-lg font-semibold text-gray-900">
                提出カレンダー
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  setCurrentMonth(today);
                  setSelectedDate(today);
                }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                今日
              </button>
              <button
                onClick={() => navigateMonth('next')}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <h2 className="text-2xl font-semibold text-gray-900">
              {format(currentMonth, 'yyyy年M月', { locale: ja })}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>提出数: <span className="font-medium text-gray-900">{monthStats.totalSubmissions}</span></span>
              <span>提出日数: <span className="font-medium text-gray-900">{monthStats.daysWithSubmissions}</span></span>
              {monthStats.unreadFeedback > 0 && (
                <span className="text-red-600">未読: <span className="font-medium">{monthStats.unreadFeedback}</span></span>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="px-6 pb-6">
          <div className="flex gap-6">
                         {/* カレンダー部分 */}
             <div className="w-full max-w-xl">
                             {/* 曜日ヘッダー */}
               <div className="grid grid-cols-7 border-b border-gray-200">
                 {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
                   <div key={day} className={`h-8 flex items-center justify-center text-xs font-medium border-r border-gray-200 last:border-r-0 ${
                     index === 0 ? 'text-red-500' : 
                     index === 6 ? 'text-blue-500' : 
                     'text-gray-600'
                   }`}>
                     {day}
                   </div>
                 ))}
               </div>
              
              {/* カレンダーグリッド */}
              <div className="grid grid-cols-7">
              {(() => {
                const monthStart = startOfMonth(currentMonth);
                const monthEnd = endOfMonth(currentMonth);
                const startDate = subDays(monthStart, getDay(monthStart));
                const endDate = addDays(monthEnd, 6 - getDay(monthEnd));
                const days = eachDayOfInterval({ start: startDate, end: endDate });
                
                return days.map((day) => {
                  const dayEssays = getEssaysForDate(day);
                  const hasSubmissions = dayEssays.length > 0;
                  const hasUnreadFeedback = dayEssays.some(essay => 
                    essay.status === 'feedback_completed' && !essay.feedbackRead
                  );
                  void hasUnreadFeedback;
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                  const isToday = isSameDay(day, new Date());
                  const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                  
                                                                                 const dayClasses = [
                         'aspect-square p-0.5 border-r border-b border-gray-200 last:border-r-0 cursor-pointer transition-colors relative',
                         'hover:bg-gray-50'
                       ];
                      
                      if (!isCurrentMonth) {
                        dayClasses.push('bg-gray-50 text-gray-400');
                      } else if (isToday) {
                        dayClasses.push('!border !border-blue-400');
                      } else if (isWeekend) {
                        dayClasses.push('bg-gray-25');
                      }
                      
                      // 選択された日付のハイライト
                      if (selectedDate && isSameDay(day, selectedDate)) {
                        dayClasses.push('bg-blue-100 border-2 border-blue-300');
                      }
                  
                                        const handleDayClick = () => {
                        setSelectedDate(day);
                      };
                  
                  return (
                    <div
                      key={day.toISOString()}
                      className={dayClasses.join(' ')}
                      onClick={handleDayClick}
                    >
                                             {/* 日付番号 */}
                                               <div className="flex flex-col items-center justify-center h-full relative">
                          {/* 日付番号 - 左上隅 */}
                          <span className={`text-xs font-medium absolute top-1 left-1 ${
                            isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                          }`}>
                            {format(day, 'd')}
                          </span>
                          
                          {/* 中央のマーク */}
                          {hasSubmissions && (
                            <div className="flex items-center justify-center">
                              {(() => {
                                const pendingOrProcessingCount = dayEssays.filter(essay => essay.status === 'pending' || essay.status === 'processing').length;
                                const unreadCount = dayEssays.filter(essay => essay.status === 'feedback_completed' && !essay.feedbackRead).length;
                                if (pendingOrProcessingCount > 0) {
                                  return (
                                    <div className="w-6 h-6 rounded-full bg-red-100 border-2 border-red-300 flex items-center justify-center">
                                      <span className="text-xs font-bold text-red-600">{pendingOrProcessingCount}</span>
                                    </div>
                                  );
                                }
                                if (unreadCount > 0) {
                                  return (
                                    <div className="w-6 h-6 rounded-full bg-red-100 border-2 border-red-300 flex items-center justify-center">
                                      <span className="text-xs font-bold text-red-600">{unreadCount}</span>
                                    </div>
                                  );
                                }
                                return (
                                  <div className="w-6 h-6 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center">
                                    <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                    </div>
                  );
                });
              })()}
              </div>
            </div>
            
                         {/* 選択された日付の詳細 */}
             <div className="flex-1 min-w-[300px]">
               {selectedDate ? (
                 <div className="bg-white border border-gray-200 rounded-lg flex flex-col" style={{ height: '400px' }}>
                   <div className="p-3 border-b border-gray-200">
                     <h3 className="text-base font-semibold text-gray-900">
                       {format(selectedDate, 'yyyy年M月d日', { locale: ja })}
                     </h3>
                   </div>
                   
                   <div className="flex-1 overflow-y-auto p-3">
                    {(() => {
                      const dayEssays = getEssaysForDate(selectedDate);
                      
                                             if (dayEssays.length === 0) {
                         return (
                           <div className="text-center py-6">
                             <p className="text-sm text-gray-500">この日は提出がありません</p>
                           </div>
                         );
                       }
                       
                       return (
                         <div className="space-y-2">
                           {dayEssays.map((essay) => {
                             const hasUnreadFeedback = essay.status === 'feedback_completed' && !essay.feedbackRead;
                             const essayDate = parseDate(essay.submittedAt);
                             
                             return (
                               <div
                                 key={essay.id}
                                 className={`p-2 rounded-lg border cursor-pointer transition-colors relative ${
                                   hasUnreadFeedback 
                                     ? 'bg-red-50 border-red-200 hover:bg-red-100' 
                                     : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                                 }`}
                                 onClick={() => {
                                   if ('videoId' in essay) {
                                     window.location.href = `/youtuber-essays/${essay.id}`;
                                   } else {
                                     window.location.href = `/basic-essays/${essay.id}`;
                                   }
                                 }}
                               >
                                 <div className="flex items-center justify-between mb-1">
                                   <div className="flex items-center gap-2 flex-1">
                                     <div className={`w-1.5 h-1.5 rounded-full ${
                                       hasUnreadFeedback ? 'bg-red-500' : 'bg-blue-500'
                                     }`} />
                                     <span className="text-xs font-medium text-gray-700 truncate">
                                       {'videoId' in essay ? 
                                         (videoTitles[essay.videoId] || 'YouTube学習エッセイ') : 
                                         'エッセイ提出'
                                       }
                                     </span>
                                   </div>
                                   <div className="flex items-center gap-1 ml-2">
                                     {'videoId' in essay && (
                                       <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-100 whitespace-nowrap">
                                         {essay.taskType === 'summary' ? 'Summary' : 
                                          essay.taskType === 'opinion' ? 'Opinion' : 
                                          essay.taskId.includes('summary') ? 'Summary' : 
                                          essay.taskId.includes('opinion') ? 'Opinion' : 'Summary'}
                                       </span>
                                     )}
                                     {essay.status === 'feedback_completed' && essay.feedbackRead && (
                                       <span className="px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700 whitespace-nowrap">
                                         既読
                                       </span>
                                     )}
                                     {essay.status === 'feedback_completed' && !essay.feedbackRead && (
                                       <span className="px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700 whitespace-nowrap">
                                         未読
                                       </span>
                                     )}
                                     {essay.status === 'processing' && (
                                       <span className="px-1.5 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700 whitespace-nowrap">
                                         処理中
                                       </span>
                                     )}
                                     {essay.status === 'pending' && (
                                       <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-700 whitespace-nowrap">
                                         待機中
                                       </span>
                                     )}
                                     {essay.status === 'error' && (
                                       <span className="px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700 whitespace-nowrap">
                                         エラー
                                       </span>
                                     )}
                                   </div>
                                 </div>
                                 
                                 <div className="flex gap-3">
                                   <div className="text-xs text-gray-600 space-y-0.5 flex-1">
                                     <div>
                                       提出時間: {essayDate ? format(essayDate, 'HH:mm') : '--:--'}
                                     </div>
                                     <div>
                                       語数: {essay.wordCount || 0} 語
                                     </div>
                                     <div>
                                       所要時間: {essay.timeSpent ? Math.round(essay.timeSpent / 60) : 0} 分
                                     </div>
                                   </div>
                                   {essay.content && (
                                     <div className="w-96 p-2 bg-white rounded border text-xs text-gray-700 max-h-16 overflow-hidden">
                                       <div className="line-clamp-3">
                                         {essay.content.substring(0, 200)}
                                         {essay.content.length > 200 && '...'}
                                       </div>
                                     </div>
                                   )}
                                 </div>
                               </div>
                             );
                           })}
                         </div>
                       );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center flex items-center justify-center" style={{ height: '400px' }}>
                  <div>
                    <CalendarIcon className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">日付を選択してください</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
