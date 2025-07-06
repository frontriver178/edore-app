import { supabase } from '../supabaseClient';

export const scheduleService = {
  // 組織の面談スケジュール一覧取得
  async getSchedulesByOrganization(organizationId) {
    const { data, error } = await supabase
      .from('interview_schedules')
      .select(`
        *,
        students(id, name, grade),
        users(id, name)
      `)
      .eq('organization_id', organizationId)
      .order('scheduled_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // 特定生徒の面談スケジュール取得
  async getSchedulesByStudent(studentId) {
    const { data, error } = await supabase
      .from('interview_schedules')
      .select(`
        *,
        students(id, name, grade),
        users(id, name)
      `)
      .eq('student_id', studentId)
      .order('scheduled_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // 特定講師の面談スケジュール取得
  async getSchedulesByTeacher(teacherId) {
    const { data, error } = await supabase
      .from('interview_schedules')
      .select(`
        *,
        students(id, name, grade),
        users(id, name)
      `)
      .eq('teacher_id', teacherId)
      .order('scheduled_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // 面談スケジュール作成
  async createSchedule(scheduleData) {
    const { data, error } = await supabase
      .from('interview_schedules')
      .insert([scheduleData])
      .select(`
        *,
        students(id, name, grade),
        users(id, name)
      `);

    if (error) throw error;
    return data[0];
  },

  // 面談スケジュール更新
  async updateSchedule(scheduleId, updates) {
    const { data, error } = await supabase
      .from('interview_schedules')
      .update(updates)
      .eq('id', scheduleId)
      .select(`
        *,
        students(id, name, grade),
        users(id, name)
      `);

    if (error) throw error;
    return data[0];
  },

  // 面談スケジュール削除
  async deleteSchedule(scheduleId) {
    const { error } = await supabase
      .from('interview_schedules')
      .delete()
      .eq('id', scheduleId);

    if (error) throw error;
    return true;
  },

  // 面談ステータス更新
  async updateScheduleStatus(scheduleId, status) {
    const { data, error } = await supabase
      .from('interview_schedules')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', scheduleId)
      .select();

    if (error) throw error;
    return data[0];
  },

  // 面談スケジュール統計取得
  async getScheduleStats(organizationId) {
    const { data, error } = await supabase
      .from('interview_schedules')
      .select('status, scheduled_date')
      .eq('organization_id', organizationId);

    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];
    const stats = {
      total: data.length,
      scheduled: data.filter(s => s.status === 'scheduled').length,
      completed: data.filter(s => s.status === 'completed').length,
      cancelled: data.filter(s => s.status === 'cancelled').length,
      upcoming: data.filter(s => s.status === 'scheduled' && s.scheduled_date >= today).length,
      overdue: data.filter(s => s.status === 'scheduled' && s.scheduled_date < today).length
    };

    return stats;
  },

  // 今週の面談スケジュール取得
  async getWeeklySchedules(organizationId) {
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));

    const { data, error } = await supabase
      .from('interview_schedules')
      .select(`
        *,
        students(id, name, grade),
        users(id, name)
      `)
      .eq('organization_id', organizationId)
      .gte('scheduled_date', startOfWeek.toISOString().split('T')[0])
      .lte('scheduled_date', endOfWeek.toISOString().split('T')[0])
      .order('scheduled_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // 面談完了時に面談記録へ移行
  async completeInterview(scheduleId, interviewData) {
    // トランザクション的な処理
    try {
      // 1. 面談記録を作成
      const { data: interviewRecord, error: insertError } = await supabase
        .from('student_interviews')
        .insert([{
          ...interviewData,
          schedule_id: scheduleId
        }])
        .select();

      if (insertError) throw insertError;

      // 2. スケジュールのステータスを完了に更新
      const { error: updateError } = await supabase
        .from('interview_schedules')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', scheduleId);

      if (updateError) throw updateError;

      return interviewRecord[0];
    } catch (error) {
      throw error;
    }
  }
}; 