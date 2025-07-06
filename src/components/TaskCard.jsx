import React from 'react';

const TaskCard = ({ task, onStatusChange, onEdit, onDelete }) => {
  const isOverdue = task.status === 'pending' && 
    new Date(task.due_date) < new Date();
  const categoryColor = task.task_categories?.color || '#6b7280';

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return '未着手';
      case 'in_progress': return '作業中';
      case 'completed': return '完了';
      case 'cancelled': return 'キャンセル';
      default: return status;
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'urgent': return '緊急';
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return priority;
    }
  };

  return (
    <div className={`task-card ${isOverdue ? 'overdue' : ''} status-${task.status}`}>
      <div className="task-header">
        <span 
          className="task-category"
          style={{ 
            backgroundColor: categoryColor,
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px'
          }}
        >
          {task.task_categories?.name || 'カテゴリなし'}
        </span>
        <span 
          className="task-priority"
          style={{ 
            color: getPriorityColor(task.priority),
            fontWeight: 'bold',
            fontSize: '12px'
          }}
        >
          {getPriorityText(task.priority)}
        </span>
      </div>
      
      <h3 className="task-title" style={{ margin: '8px 0', fontSize: '16px' }}>
        {task.title}
      </h3>
      
      {task.description && (
        <p className="task-description" style={{ 
          color: '#666', 
          fontSize: '14px',
          margin: '8px 0'
        }}>
          {task.description}
        </p>
      )}
      
      <div className="task-details" style={{ fontSize: '13px', color: '#555' }}>
        <div className="task-student" style={{ margin: '4px 0' }}>
          👤 {task.students?.name} ({task.students?.grade}年生)
        </div>
        <div className="task-teacher" style={{ margin: '4px 0' }}>
          👨‍🏫 {task.users?.name}
        </div>
        <div className="task-due-date" style={{ margin: '4px 0' }}>
          📅 期限: {new Date(task.due_date).toLocaleDateString()}
        </div>
        {task.estimated_hours && (
          <div className="task-hours" style={{ margin: '4px 0' }}>
            ⏱️ 予想時間: {task.estimated_hours}時間
          </div>
        )}
      </div>
      
      <div className="task-actions" style={{ 
        marginTop: '12px',
        display: 'flex',
        gap: '8px',
        alignItems: 'center'
      }}>
        <select 
          value={task.status} 
          onChange={(e) => onStatusChange(task.id, e.target.value)}
          className="status-select"
          style={{
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid #ddd'
          }}
        >
          <option value="pending">未着手</option>
          <option value="in_progress">作業中</option>
          <option value="completed">完了</option>
          <option value="cancelled">キャンセル</option>
        </select>
        
        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => onEdit(task)}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          編集
        </button>
        
        <button 
          className="btn btn-danger btn-sm"
          onClick={() => onDelete(task.id)}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          削除
        </button>
      </div>

      {task.feedback && (
        <div className="task-feedback" style={{
          marginTop: '8px',
          padding: '8px',
          backgroundColor: '#f3f4f6',
          borderRadius: '4px',
          fontSize: '13px'
        }}>
          <strong>フィードバック:</strong> {task.feedback}
        </div>
      )}

      {isOverdue && (
        <div className="overdue-badge" style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          backgroundColor: '#ef4444',
          color: 'white',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 'bold'
        }}>
          期限切れ
        </div>
      )}
    </div>
  );
};

export default TaskCard; 