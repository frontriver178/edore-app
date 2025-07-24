-- ==========================================
-- RLSポリシー動作確認テスト
-- ==========================================

-- 全テーブルのRLS状態確認
SELECT 
    tablename,
    CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '🚨 DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('students', 'users', 'teaching_schedules', 'invitation_codes', 'organizations')
ORDER BY tablename;

-- teaching_schedulesのポリシー詳細
SELECT 
    '=== teaching_schedules ポリシー一覧 ===' as section;

SELECT 
    policyname,
    cmd as operation,
    CASE 
        WHEN cmd = 'SELECT' THEN 'データ参照'
        WHEN cmd = 'INSERT' THEN 'データ作成'
        WHEN cmd = 'UPDATE' THEN 'データ更新'
        WHEN cmd = 'DELETE' THEN 'データ削除'
        ELSE cmd::text
    END as description
FROM pg_policies 
WHERE tablename = 'teaching_schedules' 
AND schemaname = 'public'
ORDER BY cmd;

-- システム統計
SELECT 
    '=== システム統計 ===' as section;

SELECT 
    'アクティブ組織数' as metric,
    COUNT(*) as count
FROM organizations 
WHERE subscription_status = 'active'

UNION ALL

SELECT 
    '総ユーザー数' as metric,
    COUNT(*) as count
FROM users

UNION ALL

SELECT 
    '現在のスケジュール数' as metric,
    COUNT(*) as count
FROM teaching_schedules

UNION ALL

SELECT 
    '有効な招待コード数' as metric,
    COUNT(*) as count
FROM invitation_codes 
WHERE used = false AND expires_at > NOW();

-- 完了メッセージ
SELECT '🔒 RLS動作確認テストが完了しました!' as message; 