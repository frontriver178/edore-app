-- ==========================================
-- SaaSオンボーディングシステム 動作確認テスト
-- ==========================================

-- 1. システム状態確認
SELECT '=== システム状態確認 ===' as section;
SELECT * FROM check_system_status();

-- 2. 招待コード状態確認
SELECT '=== 招待コード状態確認 ===' as section;
SELECT * FROM check_invitation_codes();

-- 3. テーブル構造確認
SELECT '=== テーブル構造確認 ===' as section;
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('invitation_codes', 'organization_applications', 'user_onboarding_status')
ORDER BY table_name, ordinal_position;

-- 4. RLSポリシー確認
SELECT '=== RLSポリシー確認 ===' as section;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('invitation_codes', 'organization_applications', 'user_onboarding_status');

-- 5. 組織テーブル確認
SELECT '=== 組織テーブル確認 ===' as section;
SELECT id, name, contact_email, subscription_plan, subscription_status FROM organizations;

-- 6. 実際のデータ確認
SELECT '=== 実際のデータ確認 ===' as section;
SELECT 
    'invitation_codes' as table_name,
    code,
    role,
    expires_at,
    used,
    created_at
FROM invitation_codes;

-- 7. 招待コード使用テスト（仮想）
SELECT '=== 招待コード使用テスト ===' as section;
-- 実際にはこのテストは実行しない（実データを変更するため）
SELECT 
    'ADMIN-DEMO2024' as code,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM invitation_codes 
            WHERE code = 'ADMIN-DEMO2024' 
            AND used = false 
            AND expires_at > NOW()
        ) THEN 'VALID'
        ELSE 'INVALID'
    END as status;

-- 8. 組織申請テーブル確認
SELECT '=== 組織申請テーブル確認 ===' as section;
SELECT COUNT(*) as total_applications FROM organization_applications;

-- 9. オンボーディング状況確認
SELECT '=== オンボーディング状況確認 ===' as section;
SELECT COUNT(*) as total_onboarding_records FROM user_onboarding_status;

-- 10. 関数の存在確認
SELECT '=== 関数の存在確認 ===' as section;
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('use_invitation_code', 'start_user_onboarding', 'check_system_status', 'check_invitation_codes');

-- 11. 権限確認
SELECT '=== 権限確認 ===' as section;
SELECT 
    grantee,
    table_name,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name IN ('invitation_codes', 'organization_applications', 'user_onboarding_status');

-- 12. 最終チェック
SELECT '=== 最終チェック ===' as section;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM invitation_codes WHERE code = 'ADMIN-DEMO2024') THEN '✅ 招待コードが存在'
        ELSE '❌ 招待コードが存在しない'
    END as invitation_check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_onboarding_status') THEN '✅ オンボーディングテーブルが存在'
        ELSE '❌ オンボーディングテーブルが存在しない'
    END as onboarding_check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'use_invitation_code') THEN '✅ 招待コード使用関数が存在'
        ELSE '❌ 招待コード使用関数が存在しない'
    END as function_check; 