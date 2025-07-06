import { supabase } from '../supabaseClient';

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
  }
}; 