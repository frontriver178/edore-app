/**
 * LINE通知サービス
 * LINE Messaging APIとLINE Notifyを使用した通知機能
 */

class LineService {
  constructor() {
    this.channelAccessToken = process.env.REACT_APP_LINE_CHANNEL_ACCESS_TOKEN;
    this.lineNotifyToken = process.env.REACT_APP_LINE_NOTIFY_TOKEN;
    this.messagingApiUrl = 'https://api.line.me/v2/bot/message/push';
    this.notifyApiUrl = 'https://notify-api.line.me/api/notify';
  }

  /**
   * LINE Messaging APIを使用してメッセージを送信
   * @param {string} userId - LINEユーザーID
   * @param {string} message - 送信メッセージ
   * @param {object} options - 追加オプション
   */
  async sendMessage(userId, message, options = {}) {
    if (!this.channelAccessToken) {
      console.warn('LINE Channel Access Token が設定されていません');
      return { success: false, error: 'Token not configured' };
    }

    if (!userId) {
      console.warn('LINE User ID が指定されていません');
      return { success: false, error: 'User ID required' };
    }

    try {
      const payload = {
        to: userId,
        messages: [
          {
            type: 'text',
            text: message
          }
        ]
      };

      const response = await fetch(this.messagingApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.channelAccessToken}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`LINE API Error: ${errorData.message || response.statusText}`);
      }

      console.log('LINE メッセージ送信成功:', { userId, message: message.substring(0, 50) + '...' });
      return { success: true };
    } catch (error) {
      console.error('LINE メッセージ送信エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * LINE Notifyを使用してメッセージを送信
   * @param {string} message - 送信メッセージ
   */
  async sendNotify(message) {
    if (!this.lineNotifyToken) {
      console.warn('LINE Notify Token が設定されていません');
      return { success: false, error: 'Notify token not configured' };
    }

    try {
      const formData = new FormData();
      formData.append('message', message);

      const response = await fetch(this.notifyApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.lineNotifyToken}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`LINE Notify Error: ${errorData.message || response.statusText}`);
      }

      console.log('LINE Notify送信成功:', message.substring(0, 50) + '...');
      return { success: true };
    } catch (error) {
      console.error('LINE Notify送信エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ログイン通知を送信
   * @param {object} user - ユーザー情報
   * @param {string} loginTime - ログイン時刻
   */
  async sendLoginNotification(user, loginTime = new Date()) {
    const time = loginTime.toLocaleString('ja-JP');
    const role = this.getRoleDisplayName(user.role);
    
    const message = `🔐 ログイン通知

👤 ${user.name || 'ユーザー'}さん（${role}）がログインしました
⏰ ${time}
🏫 ${user.organization_name || '組織名未設定'}

システムが正常に動作しています。`;

    // ユーザー個人にメッセージ送信（LINE IDが設定されている場合）
    if (user.line_user_id) {
      await this.sendMessage(user.line_user_id, message);
    }

    // 管理者にもNotify送信（設定されている場合）
    if (user.role === 'admin' || user.role === 'teacher') {
      await this.sendNotify(message);
    }

    return { success: true };
  }

  /**
   * タスク期限通知を送信
   * @param {object} task - タスク情報
   * @param {object} user - ユーザー情報
   */
  async sendTaskDeadlineNotification(task, user) {
    const dueDate = new Date(task.due_date).toLocaleDateString('ja-JP');
    
    const message = `📋 タスク期限通知

⚠️ タスクの期限が近づいています

📝 ${task.title}
👤 担当: ${user.name}
📅 期限: ${dueDate}
📖 内容: ${task.description || '詳細なし'}

早めの対応をお願いします。`;

    if (user.line_user_id) {
      return await this.sendMessage(user.line_user_id, message);
    }

    return { success: false, error: 'LINE ID not configured' };
  }

  /**
   * 授業予定通知を送信
   * @param {object} schedule - 授業スケジュール
   * @param {object} student - 生徒情報
   * @param {object} teacher - 講師情報
   */
  async sendClassScheduleNotification(schedule, student, teacher) {
    const scheduleDate = new Date(schedule.scheduled_date).toLocaleDateString('ja-JP');
    const scheduleTime = schedule.scheduled_time || '時間未定';
    
    const message = `📚 授業予定通知

📅 ${scheduleDate} ${scheduleTime}
👨‍🏫 講師: ${teacher.name}
👨‍🎓 生徒: ${student.name}
📖 科目: ${schedule.subject || '科目未定'}
📝 内容: ${schedule.topic || '内容未定'}

準備をお願いします。`;

    const notifications = [];
    
    // 生徒に送信
    if (student.line_user_id) {
      notifications.push(this.sendMessage(student.line_user_id, message));
    }
    
    // 講師に送信
    if (teacher.line_user_id) {
      notifications.push(this.sendMessage(teacher.line_user_id, message));
    }

    const results = await Promise.all(notifications);
    return { success: results.some(r => r.success) };
  }

  /**
   * 面談予定通知を送信
   * @param {object} interview - 面談スケジュール
   * @param {object} student - 生徒情報
   * @param {object} teacher - 講師情報
   */
  async sendInterviewScheduleNotification(interview, student, teacher) {
    const interviewDate = new Date(interview.scheduled_date).toLocaleDateString('ja-JP');
    const interviewTime = interview.scheduled_time || '時間未定';
    
    const message = `🗣️ 面談予定通知

📅 ${interviewDate} ${interviewTime}
👨‍🏫 面談者: ${teacher.name}
👨‍🎓 生徒: ${student.name}
⏱️ 予定時間: ${interview.duration_minutes || 30}分
📝 目的: ${interview.purpose || '面談'}

よろしくお願いします。`;

    const notifications = [];
    
    // 生徒に送信
    if (student.line_user_id) {
      notifications.push(this.sendMessage(student.line_user_id, message));
    }
    
    // 講師に送信
    if (teacher.line_user_id) {
      notifications.push(this.sendMessage(teacher.line_user_id, message));
    }

    const results = await Promise.all(notifications);
    return { success: results.some(r => r.success) };
  }

  /**
   * 役割の表示名を取得
   * @param {string} role - ユーザー役割
   */
  getRoleDisplayName(role) {
    const roleNames = {
      'admin': '管理者',
      'teacher': '講師',
      'student': '生徒'
    };
    return roleNames[role] || '不明';
  }

  /**
   * サービスの設定状況を確認
   */
  getConfigStatus() {
    return {
      messagingApi: !!this.channelAccessToken,
      lineNotify: !!this.lineNotifyToken,
      ready: !!(this.channelAccessToken || this.lineNotifyToken)
    };
  }
}

// シングルトンインスタンスを作成してエクスポート
const lineService = new LineService();

export default lineService;
export { LineService };