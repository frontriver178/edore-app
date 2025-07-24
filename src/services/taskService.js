import { supabase } from '../supabaseClient';
import lineService from './lineService';

export const taskService = {
  // タスクカテゴリの管理
  async getTaskCategories(organizationId) {
    const { data, error } = await supabase
      .from('task_categories')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');
    
    if (error) throw error;
    return data;
  },

  async createTaskCategory(categoryData) {
    const { data, error } = await supabase
      .from('task_categories')
      .insert([categoryData])
      .select();
    
    if (error) throw error;
    return data[0];
  },

  // 生徒タスクの管理
  async getStudentTasks(studentId) {
    const { data, error } = await supabase
      .from('student_tasks')
      .select(`
        *,
        task_categories(name, color),
        students(name),
        users(name)
      `)
      .eq('student_id', studentId)
      .order('due_date', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // 特定の生徒のタスクを取得（getStudentTasksのエイリアス）
  async getTasksByStudent(studentId) {
    const { data, error } = await supabase
      .from('student_tasks')
      .select(`
        *,
        task_categories(name, color),
        students(name, grade),
        users(name)
      `)
      .eq('student_id', studentId)
      .order('due_date', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  async getTasksByOrganization(organizationId) {
    const { data, error } = await supabase
      .from('student_tasks')
      .select(`
        *,
        task_categories(name, color),
        students(name, grade),
        users(name)
      `)
      .eq('organization_id', organizationId)
      .order('due_date', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  async getOverdueTasks(organizationId) {
    const { data, error } = await supabase
      .from('student_tasks')
      .select(`
        *,
        task_categories(name, color),
        students(name, grade),
        users(name)
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .lt('due_date', new Date().toISOString().split('T')[0])
      .order('due_date', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  async createTask(taskData) {
    const { data, error } = await supabase
      .from('student_tasks')
      .insert([taskData])
      .select();
    
    if (error) throw error;
    return data[0];
  },

  async updateTask(taskId, updateData) {
    const { data, error } = await supabase
      .from('student_tasks')
      .update(updateData)
      .eq('id', taskId)
      .select();
    
    if (error) throw error;
    return data[0];
  },

  async updateTaskStatus(taskId, status, feedback = null) {
    const updateData = {
      status,
      ...(status === 'completed' && { 
        completion_date: new Date().toISOString(),
        feedback 
      })
    };

    const { data, error } = await supabase
      .from('student_tasks')
      .update(updateData)
      .eq('id', taskId)
      .select();
    
    if (error) throw error;
    return data[0];
  },

  async deleteTask(taskId) {
    const { error } = await supabase
      .from('student_tasks')
      .delete()
      .eq('id', taskId);
    
    if (error) throw error;
  },

  // 統計情報
  async getTaskStats(organizationId) {
    const { data, error } = await supabase
      .from('student_tasks')
      .select('status, due_date')
      .eq('organization_id', organizationId);
    
    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];
    
    return {
      total: data.length,
      pending: data.filter(task => task.status === 'pending').length,
      in_progress: data.filter(task => task.status === 'in_progress').length,
      completed: data.filter(task => task.status === 'completed').length,
      overdue: data.filter(task => 
        task.status === 'pending' && task.due_date < today
      ).length
    };
  },

  // 特定の生徒のタスク統計
  async getTaskStatsByStudent(studentId) {
    const { data, error } = await supabase
      .from('student_tasks')
      .select('status, due_date')
      .eq('student_id', studentId);
    
    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];
    
    return {
      total: data.length,
      pending: data.filter(task => task.status === 'pending').length,
      in_progress: data.filter(task => task.status === 'in_progress').length,
      completed: data.filter(task => task.status === 'completed').length,
      overdue: data.filter(task => 
        task.status === 'pending' && task.due_date < today
      ).length
    };
  },

  // LINE通知機能
  async sendTaskDeadlineNotifications(organizationId) {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // 明日が期限のタスクを取得
      const { data: tasks, error } = await supabase
        .from('student_tasks')
        .select(`
          *,
          students(name, line_user_id, line_notification_enabled),
          users(name, line_user_id, line_notification_enabled)
        `)
        .eq('organization_id', organizationId)
        .eq('due_date', tomorrowStr)
        .eq('status', 'pending');

      if (error) throw error;

      const notifications = [];

      for (const task of tasks) {
        // 生徒に通知
        if (task.students?.line_user_id && task.students?.line_notification_enabled) {
          notifications.push(
            lineService.sendTaskDeadlineNotification(task, task.students)
          );
        }

        // 担当講師に通知
        if (task.users?.line_user_id && task.users?.line_notification_enabled) {
          notifications.push(
            lineService.sendTaskDeadlineNotification(task, task.users)
          );
        }
      }

      const results = await Promise.all(notifications);
      return {
        success: true,
        tasksChecked: tasks.length,
        notificationsSent: results.filter(r => r.success).length
      };
    } catch (error) {
      console.error('タスク期限通知エラー:', error);
      return { success: false, error: error.message };
    }
  },

  // タスク作成時に即座に通知
  async createTaskWithNotification(taskData) {
    try {
      // タスクを作成
      const { data: task, error } = await supabase
        .from('student_tasks')
        .insert([taskData])
        .select(`
          *,
          students(name, line_user_id, line_notification_enabled),
          users(name, line_user_id, line_notification_enabled)
        `)
        .single();

      if (error) throw error;

      // 通知を送信
      const notifications = [];

      // 生徒に通知
      if (task.students?.line_user_id && task.students?.line_notification_enabled) {
        const message = `📋 新しいタスクが追加されました

📝 ${task.title}
📅 期限: ${new Date(task.due_date).toLocaleDateString('ja-JP')}
📖 内容: ${task.description || '詳細なし'}

頑張って取り組みましょう！`;

        notifications.push(
          lineService.sendMessage(task.students.line_user_id, message)
        );
      }

      // 担当講師に通知
      if (task.users?.line_user_id && task.users?.line_notification_enabled) {
        const message = `📋 タスクを作成しました

👤 対象生徒: ${task.students?.name}
📝 ${task.title}
📅 期限: ${new Date(task.due_date).toLocaleDateString('ja-JP')}
📖 内容: ${task.description || '詳細なし'}`;

        notifications.push(
          lineService.sendMessage(task.users.line_user_id, message)
        );
      }

      await Promise.all(notifications);
      return task;
    } catch (error) {
      console.error('タスク作成・通知エラー:', error);
      throw error;
    }
  }
}; 