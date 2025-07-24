import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // エラーが発生した場合の状態を更新
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // エラーの詳細を保存
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // エラーログを送信（本番環境では外部サービスに送信）
    console.error('Error caught by boundary:', error, errorInfo);
    
    // 開発環境でのみ詳細なエラー情報を表示
    if (process.env.NODE_ENV === 'development') {
      console.group('Error Boundary Details');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.groupEnd();
    }
  }

  handleRetry = () => {
    // エラー状態をリセット
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // エラーフォールバックUI
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">⚠️</div>
            <h2 className="error-boundary-title">申し訳ございません</h2>
            <p className="error-boundary-message">
              予期しないエラーが発生しました。ページを再読み込みするか、しばらく時間をおいて再度お試しください。
            </p>
            
            <div className="error-boundary-actions">
              <button 
                onClick={this.handleRetry}
                className="btn btn-primary"
              >
                再試行
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="btn btn-secondary"
              >
                ページを再読み込み
              </button>
            </div>

            {/* 開発環境でのみエラー詳細を表示 */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-boundary-details">
                <summary>エラー詳細（開発環境のみ）</summary>
                <div className="error-boundary-debug">
                  <h4>エラーメッセージ:</h4>
                  <pre>{this.state.error.toString()}</pre>
                  
                  <h4>スタックトレース:</h4>
                  <pre>{this.state.errorInfo.componentStack}</pre>
                  
                  <h4>エラーオブジェクト:</h4>
                  <pre>{JSON.stringify(this.state.error, null, 2)}</pre>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 