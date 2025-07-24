# LINE連携機能 実装ガイド

## 概要
このガイドでは、EdoreアプリにLINE通知機能を実装する手順を説明します。

## 準備作業

### 1. LINE Developers アカウント設定

1. [LINE Developers Console](https://developers.line.biz/console/)にアクセス
2. 新規プロバイダーを作成
3. 新規チャネルを作成（Messaging API）
4. 以下の情報を取得・保存：
   - Channel ID
   - Channel Secret
   - Channel Access Token

### 2. Supabase Edge Functions 設定

```bash
# Supabase CLIのインストール
npm install -g supabase

# プロジェクトの初期化
supabase init

# Edge Functionの作成
supabase functions new line-webhook
supabase functions new send-line-notification
```

### 3. 環境変数の設定

Supabaseダッシュボードで以下の環境変数を設定：

```
LINE_CHANNEL_ID=your_channel_id
LINE_CHANNEL_SECRET=your_channel_secret
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
```

## データベース設定

### 1. 必要なテーブルの作成

```sql
-- LINE連携テーブル
CREATE TABLE line_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    line_user_id TEXT UNIQUE NOT NULL,
    display_name TEXT,
    picture_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_line_connections_student ON line_connections(student_id);
CREATE INDEX idx_line_connections_line_user ON line_connections(line_user_id);

-- RLSポリシー
ALTER TABLE line_connections ENABLE ROW LEVEL SECURITY;

-- 生徒本人のみ参照・更新可能
CREATE POLICY "Students can view own LINE connection" ON line_connections
    FOR SELECT USING (
        student_id IN (
            SELECT id FROM students WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Students can update own LINE connection" ON line_connections
    FOR UPDATE USING (
        student_id IN (
            SELECT id FROM students WHERE created_by = auth.uid()
        )
    );

-- 通知設定テーブル
CREATE TABLE notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    frequency TEXT DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'daily', 'weekly')),
    time_preference TEXT, -- 例: "09:00", "18:00"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 通知履歴テーブル
CREATE TABLE notification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    content TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Edge Functions 実装

### 1. LINE Webhook処理 (line-webhook)

```typescript
// supabase/functions/line-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verify } from 'https://deno.land/x/line_signature@v1.0.0/mod.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const channelSecret = Deno.env.get('LINE_CHANNEL_SECRET')!

serve(async (req) => {
  try {
    const body = await req.text()
    const signature = req.headers.get('x-line-signature')
    
    // 署名検証
    if (!verify(body, channelSecret, signature!)) {
      return new Response('Invalid signature', { status: 401 })
    }
    
    const events = JSON.parse(body).events
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    for (const event of events) {
      if (event.type === 'follow') {
        // LINE友だち追加時の処理
        const lineUserId = event.source.userId
        
        // ユーザー情報を取得
        const profile = await getLineProfile(lineUserId)
        
        // QRコードやリンクからの参照情報があれば処理
        // 一時的な連携トークンを生成して返信
      }
    }
    
    return new Response('OK', { status: 200 })
  } catch (err) {
    return new Response(String(err), { status: 500 })
  }
})
```

### 2. 通知送信処理 (send-line-notification)

```typescript
// supabase/functions/send-line-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const accessToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')!

serve(async (req) => {
  try {
    const { studentId, type, content } = await req.json()
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // LINE接続情報を取得
    const { data: connection } = await supabase
      .from('line_connections')
      .select('line_user_id')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .single()
    
    if (!connection) {
      return new Response('No active LINE connection', { status: 404 })
    }
    
    // LINE APIで送信
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: connection.line_user_id,
        messages: [{
          type: 'text',
          text: content
        }]
      })
    })
    
    // 送信履歴を記録
    await supabase
      .from('notification_history')
      .insert({
        student_id: studentId,
        notification_type: type,
        content: content,
        status: response.ok ? 'sent' : 'failed'
      })
    
    return new Response('Notification sent', { status: 200 })
  } catch (err) {
    return new Response(String(err), { status: 500 })
  }
})
```

## フロントエンド実装

### 1. LINE連携コンポーネント

```jsx
// src/components/LineConnect.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import QRCode from 'react-qr-code'

const LineConnect = ({ studentId }) => {
  const [connection, setConnection] = useState(null)
  const [connectUrl, setConnectUrl] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConnection()
    generateConnectUrl()
  }, [studentId])

  const fetchConnection = async () => {
    const { data } = await supabase
      .from('line_connections')
      .select('*')
      .eq('student_id', studentId)
      .single()
    
    setConnection(data)
    setLoading(false)
  }

  const generateConnectUrl = () => {
    // LINE公式アカウントのURL + 生徒IDパラメータ
    const lineUrl = `https://line.me/R/ti/p/@YOUR_LINE_ID?studentId=${studentId}`
    setConnectUrl(lineUrl)
  }

  const disconnect = async () => {
    if (!confirm('LINE連携を解除しますか？')) return
    
    await supabase
      .from('line_connections')
      .update({ status: 'inactive' })
      .eq('student_id', studentId)
    
    fetchConnection()
  }

  if (loading) return <div>読み込み中...</div>

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">LINE連携</h3>
      </div>
      <div className="card-content">
        {connection && connection.status === 'active' ? (
          <div>
            <p className="mb-4">
              <strong>連携済み:</strong> {connection.display_name}
            </p>
            <button 
              onClick={disconnect}
              className="btn btn-error"
            >
              連携を解除
            </button>
          </div>
        ) : (
          <div>
            <p className="mb-4">
              QRコードを読み取るか、リンクをクリックしてLINE連携を行ってください。
            </p>
            <div className="mb-4">
              <QRCode value={connectUrl} size={200} />
            </div>
            <a 
              href={connectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              LINEで連携する
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export default LineConnect
```

### 2. 通知設定コンポーネント

```jsx
// src/components/NotificationSettings.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const NotificationSettings = ({ studentId }) => {
  const [settings, setSettings] = useState([])
  const [loading, setLoading] = useState(true)

  const notificationTypes = [
    { type: 'task_reminder', label: 'タスクリマインダー' },
    { type: 'task_deadline', label: 'タスク期限通知' },
    { type: 'lesson_reminder', label: '授業リマインダー' },
    { type: 'progress_report', label: '進捗レポート' }
  ]

  useEffect(() => {
    fetchSettings()
  }, [studentId])

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('student_id', studentId)
    
    setSettings(data || [])
    setLoading(false)
  }

  const updateSetting = async (type, enabled) => {
    const existing = settings.find(s => s.notification_type === type)
    
    if (existing) {
      await supabase
        .from('notification_settings')
        .update({ enabled })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('notification_settings')
        .insert({
          student_id: studentId,
          notification_type: type,
          enabled
        })
    }
    
    fetchSettings()
  }

  if (loading) return <div>読み込み中...</div>

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">通知設定</h3>
      </div>
      <div className="card-content">
        <div className="space-y-4">
          {notificationTypes.map(({ type, label }) => {
            const setting = settings.find(s => s.notification_type === type)
            const enabled = setting ? setting.enabled : true
            
            return (
              <div key={type} className="flex items-center justify-between">
                <label className="text-base">{label}</label>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => updateSetting(type, e.target.checked)}
                  className="toggle"
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default NotificationSettings
```

## 通知実装例

### タスク通知の実装

```javascript
// タスク作成時の通知
const createTaskWithNotification = async (taskData) => {
  // タスクを作成
  const { data: task, error } = await supabase
    .from('student_tasks')
    .insert(taskData)
    .select()
    .single()
  
  if (!error && task) {
    // 通知を送信
    await supabase.functions.invoke('send-line-notification', {
      body: {
        studentId: task.student_id,
        type: 'new_task',
        content: `新しいタスクが追加されました: ${task.title}\n期限: ${formatDate(task.deadline)}`
      }
    })
  }
}
```

## セキュリティ考慮事項

1. **署名検証**: すべてのWebhookリクエストで署名を検証
2. **アクセス制御**: RLSポリシーで適切なアクセス制御を実装
3. **トークン管理**: LINE Channel Access Tokenは環境変数で管理
4. **レート制限**: LINE APIのレート制限を考慮した実装

## テスト方法

1. **ngrokを使用したローカルテスト**
```bash
# ngrokでローカル環境を公開
ngrok http 3000

# LINE DevelopersコンソールでWebhook URLを設定
https://xxxx.ngrok.io/api/line-webhook
```

2. **テストメッセージの送信**
```javascript
// テスト用の通知送信
const testNotification = async () => {
  await supabase.functions.invoke('send-line-notification', {
    body: {
      studentId: 'test-student-id',
      type: 'test',
      content: 'これはテストメッセージです'
    }
  })
}
```

## トラブルシューティング

### よくある問題と解決方法

1. **署名検証エラー**
   - Channel Secretが正しく設定されているか確認
   - リクエストボディが変更されていないか確認

2. **メッセージが送信されない**
   - Channel Access Tokenの有効期限を確認
   - LINE接続が有効か確認

3. **Webhook URLが無効**
   - HTTPSであることを確認
   - 証明書が有効であることを確認

## 次のステップ

1. リッチメニューの実装
2. Flex Messageを使用したリッチな通知
3. 双方向コミュニケーション機能
4. 通知のスケジューリング機能