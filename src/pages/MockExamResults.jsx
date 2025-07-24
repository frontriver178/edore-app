import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useSearchParams, Link } from 'react-router-dom';
import Button from '../components/Button';
import FullPageLoader from '../components/FullPageLoader';
import SupabaseTestConnection from '../components/SupabaseTestConnection';
import { handleError } from '../utils/errorHandler';
import logger from '../utils/logger';

// 科目表示コンポーネント
const SubjectsDisplay = ({ subjects }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxVisible = 3; // 最初に表示する科目数
  
  if (!subjects || subjects.length === 0) {
    return (
      <div className="subjects-display">
        <div style={{ minHeight: '32px', display: 'flex', alignItems: 'center' }}>
          -
        </div>
      </div>
    );
  }

  const visibleSubjects = isExpanded ? subjects : subjects.slice(0, maxVisible);
  const hasMore = subjects.length > maxVisible;
  
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };
  
  return (
    <div className="subjects-display">
      <div style={{ 
        minHeight: '32px', 
        display: 'flex', 
        flexWrap: 'wrap', 
        alignContent: 'flex-start',
        transition: 'all 0.3s ease'
      }}>
        {visibleSubjects.map((subject, index) => (
          <span key={index} className="subject-item">
            {subject.subject}: {subject.deviation_value}
          </span>
        ))}
        
        {hasMore && (
          <span 
            className={`subjects-toggle ${isExpanded ? 'expanded' : 'collapsed'}`}
            onClick={toggleExpanded}
            title={isExpanded ? '折りたたむ' : `他 ${subjects.length - maxVisible} 科目を表示`}
          >
            {isExpanded ? (
              <>
                <span className="toggle-icon">▲</span>
                <span className="toggle-text">折りたたむ</span>
              </>
            ) : (
              <>
                <span className="toggle-icon">▼</span>
                <span className="toggle-text">+{subjects.length - maxVisible}</span>
              </>
            )}
          </span>
        )}
      </div>
      
      {/* 科目の統計情報 */}
      {isExpanded && subjects.length > 5 && (
        <div className="subjects-summary">
          {subjects.length}科目 (平均: {Math.round(subjects.reduce((sum, s) => sum + s.deviation_value, 0) / subjects.length * 10) / 10})
        </div>
      )}
    </div>
  );
};

const MockExamResults = () => {
  const [results, setResults] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingResult, setEditingResult] = useState(null);
  const [filterExam, setFilterExam] = useState('');
  const [filterStudent, setFilterStudent] = useState('');
  const [organizationId, setOrganizationId] = useState(null);
  const [searchParams] = useSearchParams();
  const preSelectedStudentId = searchParams.get('student');
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [formData, setFormData] = useState({
    student_id: preSelectedStudentId || '',
    exam_name: '',
    exam_date: new Date().toISOString().split('T')[0],
    overall_deviation: '', // 総合偏差値
    subjects: [{ subject: '', deviation_value: '' }], // 科目別偏差値
    notes: ''
  });

  // ログインユーザーのorganization_idを取得
  useEffect(() => {
    const fetchOrganizationId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userData, error } = await supabase
            .from('users')
            .select('organization_id')
            .eq('id', user.id)
            .single();
          
          if (error) throw error;
          if (userData) {
            setOrganizationId(userData.organization_id);
          }
        }
      } catch (error) {
        handleError(error, 'Organization ID Fetch', { userId: null });
      }
    };

    fetchOrganizationId();
  }, []);

  const fetchData = useCallback(async () => {
    if (!organizationId) return;
    
    try {
      setLoading(true);
      
      logger.debug('データ取得開始', 'MockExamResults', { organizationId });
      
      // 模試結果を取得（組織IDで絞り込み）
      let resultsQuery = supabase
        .from('mock_exam_results')
        .select(`
          *,
          students(name, grade)
        `)
        .eq('organization_id', organizationId)
        .order('exam_date', { ascending: false });

      // 特定の生徒が指定されている場合はフィルタリング
      if (preSelectedStudentId) {
        resultsQuery = resultsQuery.eq('student_id', preSelectedStudentId);
      }

      logger.debug('模試結果クエリ実行中', 'MockExamResults');
      const { data: resultsData, error: resultsError } = await resultsQuery;

      logger.debug('模試結果取得結果', 'MockExamResults', { 
        dataCount: resultsData?.length, 
        hasError: !!resultsError
      });

      if (resultsError) {
        handleError(resultsError, 'Mock Exam Results Fetch', { organizationId, preSelectedStudentId });
        if (resultsError.code === '42P01') {
          alert('エラー: mock_exam_resultsテーブルが存在しません。データベースセットアップが必要です。');
          return;
        }
        throw resultsError;
      }

      // 結果をグループ化（同じ模試をまとめる）
      const groupedResults = groupMockExamResults(resultsData || []);
      console.log('グループ化結果:', { count: groupedResults.length });

      // 生徒一覧を取得（組織IDで絞り込み）
      console.log('生徒一覧取得中...');
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, grade')
        .eq('status', 'active')
        .eq('organization_id', organizationId)
        .order('grade', { ascending: true });

      console.log('生徒一覧取得結果:', { 
        dataCount: studentsData?.length, 
        error: studentsError 
      });

      if (studentsError) {
        console.error('生徒一覧取得エラー:', studentsError);
        if (studentsError.code === '42P01') {
          alert('エラー: studentsテーブルが存在しません。データベースセットアップが必要です。');
          return;
        }
        throw studentsError;
      }

      setResults(groupedResults);
      setStudents(studentsData || []);
      console.log('✅ データ取得完了');
    } catch (error) {
      console.error('❌ データ取得エラー:', error);
      console.error('エラー詳細:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      alert('データの取得に失敗しました: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [organizationId, preSelectedStudentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 模試結果をグループ化する関数
  const groupMockExamResults = (rawResults) => {
    const grouped = {};
    
    rawResults.forEach(result => {
      const key = `${result.student_id}-${result.exam_name}-${result.exam_date}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          id: result.id,
          student_id: result.student_id,
          exam_name: result.exam_name,
          exam_date: result.exam_date,
          students: result.students,
          overall_deviation: null,
          subjects: [],
          notes: result.analysis_notes || '',
          organization_id: result.organization_id
        };
      }
      
      // 科目別偏差値を配列に追加
      if (result.subject && result.deviation_value) {
        grouped[key].subjects.push({
          subject: result.subject,
          deviation_value: result.deviation_value
        });
      }
      
      // 総合偏差値の推定（最初に見つかった値を使用、または平均値）
      if (!grouped[key].overall_deviation && result.deviation_value) {
        if (result.subject === '総合' || result.subject === '全体') {
          grouped[key].overall_deviation = result.deviation_value;
        }
      }
    });
    
    // 総合偏差値が設定されていない場合、科目平均を計算
    Object.values(grouped).forEach(group => {
      if (!group.overall_deviation && group.subjects.length > 0) {
        const avg = group.subjects.reduce((sum, s) => sum + s.deviation_value, 0) / group.subjects.length;
        group.overall_deviation = Math.round(avg * 10) / 10;
      }
    });
    
    return Object.values(grouped);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!organizationId) {
      alert('組織情報が取得できていません');
      return;
    }
    
    try {
      console.log('🚀 模試結果保存開始...');
      console.log('📝 フォームデータ:', formData);

      // 生徒の学年を取得
      console.log('👤 生徒情報取得中...', formData.student_id);
      const selectedStudent = students.find(s => s.id === formData.student_id);
      console.log('👤 選択された生徒:', selectedStudent);
      
      // 編集の場合、既存のレコードを削除
      if (editingResult) {
        console.log('🗑️ 既存レコード削除中...', {
          student_id: formData.student_id,
          exam_name: formData.exam_name,
          exam_date: formData.exam_date
        });
        
        const { error: deleteError } = await supabase
          .from('mock_exam_results')
          .delete()
          .eq('student_id', formData.student_id)
          .eq('exam_name', formData.exam_name)
          .eq('exam_date', formData.exam_date);
        
        console.log('🗑️ 削除結果:', { deleteError });
        
        if (deleteError) {
          console.error('❌ 削除エラー:', deleteError);
          throw deleteError;
        }
      }

      // 新しい構造：1つのメインレコード + 科目別レコード
      const resultRecords = [];
      
      // 総合偏差値のメインレコード
      if (formData.overall_deviation) {
        console.log('📊 総合偏差値レコード追加...');
        resultRecords.push({
          organization_id: organizationId,
          student_id: formData.student_id,
          exam_name: formData.exam_name,
          exam_date: formData.exam_date,
          subject: '総合',
          deviation_value: parseFloat(formData.overall_deviation),
          analysis_notes: formData.notes || null,
          exam_type: 'comprehensive'
        });
      }
      
      // 科目別レコード
      console.log('📚 科目別レコード処理中...', formData.subjects);
      formData.subjects
        .filter(subjectItem => subjectItem.subject && subjectItem.deviation_value)
        .forEach((subjectItem, index) => {
          console.log(`📚 科目${index + 1}:`, subjectItem);
          resultRecords.push({
            organization_id: organizationId,
            student_id: formData.student_id,
            exam_name: formData.exam_name,
            exam_date: formData.exam_date,
            subject: subjectItem.subject,
            deviation_value: parseFloat(subjectItem.deviation_value),
            analysis_notes: formData.notes || null,
            exam_type: 'subject'
          });
        });

      console.log('💾 挿入するレコード数:', resultRecords.length);
      console.log('💾 挿入データサンプル:', resultRecords[0]);

      if (resultRecords.length === 0) {
        console.error('❌ 挿入するデータがありません');
        alert('総合偏差値または科目別偏差値を入力してください');
        return;
      }

      console.log('💾 データベースに挿入中...');
      const { data: insertData, error } = await supabase
        .from('mock_exam_results')
        .insert(resultRecords)
        .select();
      
      console.log('💾 挿入結果:', { insertData, error });
      
      if (error) {
        console.error('❌ Supabase Insert Error:', error);
        console.error('❌ エラー詳細:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          insertedRecords: resultRecords
        });
        throw error;
      }
      
      console.log('✅ 保存成功');
      alert(editingResult ? '模試結果を更新しました' : '模試結果を登録しました');

      setShowForm(false);
      setEditingResult(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('❌ 保存エラー:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      alert(`保存に失敗しました: ${error.message || 'Unknown error'}`);
    }
  };

  const handleEdit = (result) => {
    setEditingResult(result);
    
    setFormData({
      student_id: result.student_id,
      exam_name: result.exam_name,
      exam_date: result.exam_date,
      overall_deviation: result.overall_deviation ? result.overall_deviation.toString() : '',
      subjects: result.subjects.length > 0 ? result.subjects.map(s => ({
        subject: s.subject,
        deviation_value: s.deviation_value.toString()
      })) : [{ subject: '', deviation_value: '' }],
      notes: result.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (result) => {
    if (!window.confirm(`${result.exam_name}の結果を削除しますか？`)) return;

    try {
      // 同じ模試のすべてのレコードを削除
      const { error } = await supabase
        .from('mock_exam_results')
        .delete()
        .eq('student_id', result.student_id)
        .eq('exam_name', result.exam_name)
        .eq('exam_date', result.exam_date);

      if (error) throw error;
      alert('模試結果を削除しました');
      fetchData();
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  const resetForm = () => {
    setFormData({
      student_id: preSelectedStudentId || '',
      exam_name: '',
      exam_date: new Date().toISOString().split('T')[0],
      overall_deviation: '',
      subjects: [{ subject: '', deviation_value: '' }],
      notes: ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // フィルタリング
  const filteredResults = results.filter(result => {
    const examMatch = filterExam === '' || result.exam_name.includes(filterExam);
    const studentMatch = filterStudent === '' || result.student_id === filterStudent;
    return examMatch && studentMatch;
  });

  // 模試名一覧取得（フィルタ用）
  const examNames = [...new Set(results.map(result => result.exam_name))].sort();

  // 模試結果の統計を計算
  const calculateMockStats = () => {
    if (filteredResults.length === 0) return null;
    
    // 総合偏差値または科目平均から統計を計算
    const deviationValues = filteredResults
      .map(r => r.overall_deviation)
      .filter(v => v && v > 0);
    
    if (deviationValues.length === 0) return {
      count: filteredResults.length,
      average: '-',
      highest: '-',
      lowest: '-'
    };
    
    const average = deviationValues.reduce((sum, score) => sum + score, 0) / deviationValues.length;
    const highest = Math.max(...deviationValues);
    const lowest = Math.min(...deviationValues);
    
    return {
      count: filteredResults.length,
      average: Math.round(average * 10) / 10,
      highest,
      lowest
    };
  };

  const stats = calculateMockStats();

  // 科目追加
  const addSubject = () => {
    setFormData(prev => ({
      ...prev,
      subjects: [...prev.subjects, { subject: '', deviation_value: '' }]
    }));
  };

  // 科目削除
  const removeSubject = (index) => {
    if (formData.subjects.length > 1) {
      setFormData(prev => ({
        ...prev,
        subjects: prev.subjects.filter((_, i) => i !== index)
      }));
    }
  };

  // 科目データ更新
  const updateSubject = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  if (loading) {
    return <FullPageLoader message="模試結果を読み込み中..." />
  }

  // 選択されている生徒の情報を取得
  const selectedStudent = preSelectedStudentId 
    ? students.find(s => s.id === preSelectedStudentId)
    : null;

  return (
    <div className="main-content">
      <div className="toolbar">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            {selectedStudent && (
              <Link 
                to={`/students/${selectedStudent.id}`} 
                className="text-green"
              >
                ← {selectedStudent.name}さんのダッシュボードに戻る
              </Link>
            )}
            <h1>
              {selectedStudent 
                ? `${selectedStudent.name}さんの模試結果` 
                : '模試結果管理'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              variant="secondary"
              size="sm"
            >
              {showDebugPanel ? '🔧 デバッグパネルを閉じる' : '🔧 デバッグパネル'}
            </Button>
            <Button
              onClick={() => {
                setShowForm(true);
                setEditingResult(null);
                resetForm();
              }}
              variant="primary"
            >
              + 新規模試結果
            </Button>
          </div>
        </div>
      </div>
      <div className="content-area">

        {/* デバッグパネル */}
        {showDebugPanel && (
          <div className="card mb-6">
            <div className="card-header">
              <h3 className="card-title">🔧 データベース接続デバッグパネル</h3>
            </div>
            <div className="card-content">
              <SupabaseTestConnection />
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">📝 現在のデータ状況</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">生徒数:</span> {students.length}
                  </div>
                  <div>
                    <span className="font-medium">模試結果数:</span> {results.length}
                  </div>
                  <div>
                    <span className="font-medium">選択中の生徒ID:</span> {preSelectedStudentId || '未選択'}
                  </div>
                  <div>
                    <span className="font-medium">ローディング状態:</span> {loading ? 'true' : 'false'}
                  </div>
                </div>
                <Button
                  onClick={fetchData}
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                >
                  🔄 データを再取得
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 統計情報 */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="stats-card">
              <div className="stats-card-value">{stats.count}</div>
              <div className="stats-card-label">結果数</div>
            </div>
            <div className="stats-card">
              <div className="stats-card-value">{stats.average}</div>
              <div className="stats-card-label">平均偏差値</div>
            </div>
            <div className="stats-card">
              <div className="stats-card-value">{stats.highest}</div>
              <div className="stats-card-label">最高偏差値</div>
            </div>
            <div className="stats-card">
              <div className="stats-card-value">{stats.lowest}</div>
              <div className="stats-card-label">最低偏差値</div>
            </div>
          </div>
        )}

        {/* フィルター */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">フィルター</h3>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">模試名</label>
                <select
                  value={filterExam}
                  onChange={(e) => setFilterExam(e.target.value)}
                  className="form-input form-select"
                >
                  <option value="">すべての模試</option>
                  {examNames.map(exam => (
                    <option key={exam} value={exam}>{exam}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">生徒</label>
                <select
                  value={filterStudent}
                  onChange={(e) => setFilterStudent(e.target.value)}
                  className="form-input form-select"
                >
                  <option value="">すべての生徒</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.name} ({student.grade}年)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {showForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title">
                  {editingResult ? '模試結果編集' : '新規模試結果'}
                </h2>
              </div>
              <div className="modal-body">
                <form id="mock-exam-form" onSubmit={handleSubmit} className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="form-label">生徒 *</label>
                      <select
                        name="student_id"
                        value={formData.student_id}
                        onChange={handleInputChange}
                        required
                        className="form-input form-select"
                      >
                        <option value="">生徒を選択</option>
                        {students.map(student => (
                          <option key={student.id} value={student.id}>
                            {student.name} ({student.grade}年)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">模試名 *</label>
                      <input
                        type="text"
                        name="exam_name"
                        value={formData.exam_name}
                        onChange={handleInputChange}
                        required
                        placeholder="例: 全統高1模試"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">試験日 *</label>
                    <input
                      type="date"
                      name="exam_date"
                      value={formData.exam_date}
                      onChange={handleInputChange}
                      required
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">総合偏差値</label>
                    <input
                      type="number"
                      name="overall_deviation"
                      value={formData.overall_deviation}
                      onChange={handleInputChange}
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="例: 62.5（任意）"
                      className="form-input"
                    />
                    <p className="text-sm text-secondary mt-1">
                      総合偏差値を入力してください。未入力の場合は科目別偏差値の平均が表示されます。
                    </p>
                  </div>

                  <div className="form-group">
                    <div className="flex items-center justify-between mb-3">
                      <label className="form-label">科目別偏差値</label>
                      <Button
                        type="button"
                        onClick={addSubject}
                        variant="secondary" 
                        size="sm"
                      >
                        + 科目追加
                      </Button>
                    </div>
                    
                    {formData.subjects.map((subjectItem, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="科目名（例: 数学）"
                            value={subjectItem.subject}
                            onChange={(e) => updateSubject(index, 'subject', e.target.value)}
                            className="form-input"
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="number"
                            placeholder="偏差値（例: 55.5）"
                            value={subjectItem.deviation_value}
                            onChange={(e) => updateSubject(index, 'deviation_value', e.target.value)}
                            step="0.1"
                            min="0"
                            max="100"
                            className="form-input"
                          />
                        </div>
                        {formData.subjects.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeSubject(index)}
                            variant="text"
                            className="text-error"
                          >
                            削除
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="form-group">
                    <label className="form-label">備考</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      className="form-input form-textarea"
                      placeholder="模試の結果に関する備考やメモ"
                    />
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <Button
                  onClick={() => {
                    setShowForm(false);
                    setEditingResult(null);
                    resetForm();
                  }}
                  variant="secondary"
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  form="mock-exam-form"
                  variant="primary"
                >
                  {editingResult ? '更新' : '登録'}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              模試結果一覧 ({filteredResults.length}件)
            </h2>
          </div>
          <div className="card-content">
            {filteredResults.length === 0 ? (
              <p className="text-light text-center py-8">
                模試結果がありません
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="spreadsheet-table">
                  <thead>
                    <tr>
                      <th className="date-column">試験日</th>
                      <th className="student-column">生徒</th>
                      <th>模試名</th>
                      <th>総合偏差値</th>
                      <th className="subjects-column">科目別偏差値</th>
                      <th className="content-column">備考欄</th>
                      <th className="actions-column">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map((result) => (
                      <tr key={`${result.student_id}-${result.exam_name}-${result.exam_date}`}>
                        <td className="date-column">
                          {new Date(result.exam_date).toLocaleDateString('ja-JP')}
                        </td>
                        <td className="student-column">
                          {result.students?.name} ({result.students?.grade}年)
                        </td>
                        <td>
                          {result.exam_name}
                        </td>
                        <td>
                          <span className="font-medium text-primary-green">
                            {result.overall_deviation || '-'}
                          </span>
                        </td>
                        <td className="subjects-column">
                          <SubjectsDisplay subjects={result.subjects} />
                        </td>
                        <td className="content-column">
                          {result.notes || '-'}
                        </td>
                        <td className="actions-column">
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleEdit(result)}
                              variant="text"
                              className="text-green"
                            >
                              編集
                            </Button>
                            <Button
                              onClick={() => handleDelete(result)}
                              variant="text"
                              className="text-error"
                            >
                              削除
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockExamResults; 