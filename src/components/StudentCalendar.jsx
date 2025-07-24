import React, { useState } from 'react';
import DateScheduleModal from './DateScheduleModal';
import '../SpreadsheetStyle.css';

const StudentCalendar = ({ 
  interviews, 
  teachingRecords, 
  tasks, 
  interviewSchedules, 
  teachingSchedules,
  studentId,
  organizationId,
  onScheduleUpdate
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  
  // 今月の日付を取得
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];
  
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  
  // 日付ごとのイベントを整理
  const getEventsForDate = (date) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    const events = [];
    
    // 面談記録
    interviews.forEach(interview => {
      if (interview.interview_date === dateStr) {
        // ホームルーム（group）の場合は別の色を使用
        const isHomeroom = interview.interview_type === 'group';
        events.push({
          type: 'interview',
          title: isHomeroom ? 'ホームルーム' : '面談',
          data: interview,
          color: isHomeroom ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800',
          isHomeroom: isHomeroom
        });
      }
    });
    
    // 指導記録
    teachingRecords.forEach(record => {
      if (record.lesson_date === dateStr) {
        events.push({
          type: 'teaching',
          title: '指導',
          data: record,
          color: 'bg-green-100 text-green-800'
        });
      }
    });
    
    // 面談予定
    interviewSchedules?.forEach(schedule => {
      if (schedule.scheduled_date === dateStr) {
        // ホームルーム（group）の場合は別の色を使用
        const isHomeroom = schedule.interview_type === 'group';
        events.push({
          type: 'interview_schedule',
          title: isHomeroom ? 'ホームルーム' : '面談予定',
          data: schedule,
          color: isHomeroom ? 'bg-orange-200 text-orange-900' : 'bg-blue-200 text-blue-900',
          isHomeroom: isHomeroom
        });
      }
    });
    
    // 指導予定
    teachingSchedules?.forEach(schedule => {
      if (schedule.scheduled_date === dateStr) {
        events.push({
          type: 'teaching_schedule',
          title: '指導予定',
          data: schedule,
          color: 'bg-green-200 text-green-900'
        });
      }
    });
    
    // タスク期限
    tasks.forEach(task => {
      if (task.due_date === dateStr) {
        const isOverdue = task.status === 'pending' && dateStr < new Date().toISOString().split('T')[0];
        events.push({
          type: 'task',
          title: 'タスク',
          data: task,
          color: isOverdue ? 'bg-red-100 text-red-800' : 'bg-purple-100 text-purple-800'
        });
      }
    });

    
    return events;
  };
  
  // 前月に移動
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  
  // 次月に移動
  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  
  // 今月に戻る
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // 日付クリック処理
  const handleDateClick = (date) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setShowDateModal(true);
  };
  
  // モーダルを閉じる
  const handleCloseModal = () => {
    setShowDateModal(false);
    setSelectedDate(null);
  };
  
  // スケジュール更新後の処理
  const handleScheduleUpdate = () => {
    // 親コンポーネントに更新を通知
    if (onScheduleUpdate) {
      onScheduleUpdate();
    }
  };
  
  const today = new Date();
  const isToday = (date) => {
    return year === today.getFullYear() && 
           month === today.getMonth() && 
           date === today.getDate();
  };
  
  return (
    <div className="calendar-container">
      {/* カレンダーヘッダー */}
      <div className="calendar-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={goToPreviousMonth}
              className="btn btn-sm btn-secondary"
            >
              ← 前月
            </button>
            <h2 className="text-lg font-semibold">
              {year}年{monthNames[month]}
            </h2>
            <button 
              onClick={goToNextMonth}
              className="btn btn-sm btn-secondary"
            >
              次月 →
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={goToToday}
              className="btn btn-sm btn-primary"
            >
              今日
            </button>
            <span className="text-sm text-secondary">
              日付をクリックして予定を管理
            </span>
          </div>
        </div>
      </div>
      
      {/* カレンダーグリッド */}
      <div className="calendar-grid">
        {/* 曜日ヘッダー */}
        <div className="calendar-weekdays">
          {dayNames.map(day => (
            <div key={day} className="calendar-weekday">
              {day}
            </div>
          ))}
        </div>
        
        {/* 日付セル */}
        <div className="calendar-days">
          {/* 前月の空白日 */}
          {Array.from({ length: startingDayOfWeek }, (_, i) => (
            <div key={`empty-${i}`} className="calendar-day empty"></div>
          ))}
          
          {/* 今月の日付 */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const date = i + 1;
            const events = getEventsForDate(date);
            
            return (
              <div 
                key={date} 
                className={`calendar-day ${isToday(date) ? 'today' : ''} clickable`}
                onClick={() => handleDateClick(date)}
                title="クリックして予定を管理"
              >
                <div className="calendar-day-number">
                  {date}
                </div>
                <div className="calendar-day-events">
                  {events.slice(0, 3).map((event, index) => (
                    <div 
                      key={index}
                      className={`calendar-event ${event.color}`}
                      title={
                        event.type === 'task' ? event.data.title :
                        event.type === 'interview' ? '面談' :
                        event.type === 'teaching' ? '指導' :
                        event.type === 'interview_schedule' ? '面談予定' :
                        event.type === 'teaching_schedule' ? '指導予定' :
                        event.title
                      }
                    >
                      {event.type === 'task' ? (
                        <span className="calendar-event-text">
                          {event.data.title.length > 6 ? 
                            event.data.title.substring(0, 6) + '...' : 
                            event.data.title}
                        </span>
                      ) : (
                        <span className="calendar-event-text">
                          {event.title}
                        </span>
                      )}
                    </div>
                  ))}
                  {events.length > 3 && (
                    <div className="calendar-event-more">
                      +{events.length - 3}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* 凡例 */}
      <div className="calendar-legend">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-100"></div>
            <span>面談記録</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-orange-100"></div>
            <span>ホームルーム記録</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-100"></div>
            <span>指導記録</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-200"></div>
            <span>面談予定</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-orange-200"></div>
            <span>ホームルーム予定</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-200"></div>
            <span>指導予定</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-purple-100"></div>
            <span>タスク期限</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-100"></div>
            <span>期限切れタスク</span>
          </div>
        </div>
        <div className="mt-2 text-xs text-secondary">
          日付をクリックして予定・タスクを管理できます
        </div>
      </div>

      {/* 日付スケジュールモーダル */}
      <DateScheduleModal
        isOpen={showDateModal}
        onClose={handleCloseModal}
        selectedDate={selectedDate}
        studentId={studentId}
        organizationId={organizationId}
        onScheduleUpdate={handleScheduleUpdate}
      />
    </div>
  );
};

export default StudentCalendar; 