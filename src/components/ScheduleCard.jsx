import React from 'react';

const ScheduleCard = ({ schedule, onStatusChange, onEdit, onDelete, onComplete }) => {
  const getStatusText = (status) => {
    switch (status) {
      case 'scheduled': return '予定';
      case 'completed': return '完了';
      case 'cancelled': return 'キャンセル';
      case 'rescheduled': return '再調整';
      default: return status;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'scheduled': return 'btn-secondary';
      case 'completed': return 'btn-success';
      case 'cancelled': return 'btn-error';
      case 'rescheduled': return 'btn-secondary';
      default: return 'btn-secondary';
    }
  };

  const getInterviewTypeText = (type) => {
    switch (type) {
      case 'regular': return '通常面談';
      case 'parent': return '保護者面談';
      case 'consultation': return '進路相談';
      case 'emergency': return '緊急面談';
      default: return type;
    }
  };

  const isOverdue = () => {
    const today = new Date().toISOString().split('T')[0];
    return schedule.status === 'scheduled' && schedule.scheduled_date < today;
  };

  const isToday = () => {
    const today = new Date().toISOString().split('T')[0];
    return schedule.scheduled_date === today;
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.substring(0, 5); // HH:MM形式
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { 
      month: 'short', 
      day: 'numeric', 
      weekday: 'short' 
    };
    return date.toLocaleDateString('ja-JP', options);
  };

  return (
    <div className={`
      p-4 border rounded-lg bg-white shadow-sm
      ${isOverdue() ? 'border-red-300 bg-red-50' : ''}
      ${isToday() ? 'border-blue-300 bg-blue-50' : ''}
    `}>
      {/* ヘッダー */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-lg">
              {schedule.students?.name}
            </span>
            <span className="text-sm text-secondary">
              ({schedule.students?.grade}年)
            </span>
            <span className={`btn btn-sm ${getStatusClass(schedule.status)}`}>
              {getStatusText(schedule.status)}
            </span>
          </div>
          
          <div className="text-sm text-secondary">
            担当: {schedule.users?.name}
          </div>
        </div>

        {isOverdue() && (
          <span className="text-sm text-error font-medium">
            期限切れ
          </span>
        )}
        
        {isToday() && (
          <span className="text-sm text-blue-600 font-medium">
            今日
          </span>
        )}
      </div>

      {/* 面談詳細 */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="text-secondary">日時:</span>
            <span className="ml-1 font-medium">
              {formatDate(schedule.scheduled_date)} {formatTime(schedule.scheduled_time)}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-secondary">時間:</span>
            <span className="ml-1">{schedule.duration_minutes}分</span>
          </div>
        </div>

        <div className="text-sm">
          <span className="text-secondary">種類:</span>
          <span className="ml-1">{getInterviewTypeText(schedule.interview_type)}</span>
        </div>

        <div className="text-sm">
          <span className="text-secondary">場所:</span>
          <span className="ml-1">{schedule.location || '教室'}</span>
        </div>

        {schedule.purpose && (
          <div className="text-sm">
            <span className="text-secondary">目的:</span>
            <span className="ml-1">{schedule.purpose}</span>
          </div>
        )}

        {schedule.notes && (
          <div className="text-sm">
            <span className="text-secondary">メモ:</span>
            <span className="ml-1">{schedule.notes}</span>
          </div>
        )}
      </div>

      {/* アクションボタン */}
      <div className="flex gap-2 flex-wrap">
        {schedule.status === 'scheduled' && (
          <>
            <button
              onClick={() => onComplete(schedule)}
              className="btn btn-sm btn-success"
            >
              面談完了
            </button>
            <button
              onClick={() => onStatusChange(schedule.id, 'cancelled')}
              className="btn btn-sm btn-error"
            >
              キャンセル
            </button>
          </>
        )}
        
        <button
          onClick={() => onEdit(schedule)}
          className="btn btn-sm btn-secondary"
        >
          編集
        </button>
        
        <button
          onClick={() => onDelete(schedule.id)}
          className="btn btn-sm btn-secondary text-error"
        >
          削除
        </button>

        {schedule.status === 'scheduled' && (
          <select
            value={schedule.status}
            onChange={(e) => onStatusChange(schedule.id, e.target.value)}
            className="form-select text-sm"
          >
            <option value="scheduled">予定</option>
            <option value="rescheduled">再調整</option>
            <option value="cancelled">キャンセル</option>
          </select>
        )}
      </div>
    </div>
  );
};

export default ScheduleCard; 