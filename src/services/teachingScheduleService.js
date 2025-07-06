import { supabase } from '../supabaseClient';

export const teachingScheduleService = {
  // 組織の指導スケジュール一覧取得
  async getSchedulesByOrganization(organizationId) {
    const { data, error } = await supabase
      .from('teaching_schedules')
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

  // 指導スケジュール作成
  async createSchedule(scheduleData) {
    const { data, error } = await supabase
      .from('teaching_schedules')
      .insert([scheduleData])
      .select(`
        *,
        students(id, name, grade),
        users(id, name)
      `);

    if (error) throw error;
    return data[0];
  },

  // 指導スケジュール更新
  async updateSchedule(scheduleId, updates) {
    const { data, error } = await supabase
      .from('teaching_schedules')
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

  // 指導スケジュール削除
  async deleteSchedule(scheduleId) {
    const { error } = await supabase
      .from('teaching_schedules')
      .delete()
      .eq('id', scheduleId);

    if (error) throw error;
    return true;
  },

  // 指導スケジュール統計取得
  async getScheduleStats(organizationId) {
    const { data, error } = await supabase
      .from('teaching_schedules')
      .select('status, scheduled_date')
      .eq('organization_id', organizationId);

    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];
    const stats = {
      total: data.length,
      scheduled: data.filter(s => s.status === 'scheduled').length,
      completed: data.filter(s => s.status === 'completed').length,
      upcoming: data.filter(s => s.status === 'scheduled' && s.scheduled_date >= today).length,
      overdue: data.filter(s => s.status === 'scheduled' && s.scheduled_date < today).length
    };

    return stats;
  },

  // 指導完了時に指導記録へ移行
  async completeTeaching(scheduleId, recordData) {
    try {
      // 1. 指導記録を作成
      const { data: teachingRecord, error: insertError } = await supabase
        .from('teaching_records')
        .insert([recordData])
        .select();

      if (insertError) throw insertError;

      // 2. スケジュールのステータスを完了に更新
      const { error: updateError } = await supabase
        .from('teaching_schedules')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', scheduleId);

      if (updateError) throw updateError;

      return teachingRecord[0];
    } catch (error) {
      throw error;
    }
  }
}; 