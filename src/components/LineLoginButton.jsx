import React, { useState, useEffect } from 'react';
import lineAuthService from '../services/lineAuthService';

const LineLoginButton = ({ 
  onSuccess, 
  onError, 
  disabled = false,
  variant = 'primary',
  size = 'default',
  className = '',
  showIcon = true,
  customText = null
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLiffReady, setIsLiffReady] = useState(false);
  const [isInLiff, setIsInLiff] = useState(false);

  useEffect(() => {
    initializeLiff();
  }, []);

  const initializeLiff = async () => {
    try {
      const initialized = await lineAuthService.initializeLIFF();
      setIsLiffReady(initialized);
      setIsInLiff(lineAuthService.isLIFFEnvironment());
    } catch (error) {
      console.error('LIFF初期化エラー:', error);
    }
  };

  const handleLineLogin = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    try {
      const result = await lineAuthService.loginWithLine();
      
      if (result) {
        // 認証データを保存
        lineAuthService.saveAuthData(result);
        
        if (onSuccess) {
          onSuccess(result);
        }
      }
    } catch (error) {
      console.error('LINEログインエラー:', error);
      if (onError) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonText = () => {
    if (customText) return customText;
    if (isLoading) return 'ログイン中...';
    if (isInLiff) return 'LINEでログイン';
    return 'LINEアカウントでログイン';
  };

  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    const sizeClasses = {
      small: 'px-3 py-2 text-sm',
      default: 'px-4 py-2 text-base',
      large: 'px-6 py-3 text-lg'
    };

    const variantClasses = {
      primary: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
      secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500',
      line: 'bg-[#00B900] hover:bg-[#00A000] text-white focus:ring-green-500',
      outline: 'border-2 border-green-600 text-green-600 hover:bg-green-50 focus:ring-green-500'
    };

    const disabledClasses = disabled || isLoading 
      ? 'opacity-50 cursor-not-allowed' 
      : 'cursor-pointer';

    return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${disabledClasses} ${className}`;
  };

  // LINE環境以外でLIFFが設定されていない場合の警告
  if (!isInLiff && !lineAuthService.getConfigStatus().channelId) {
    return (
      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          ⚠️ LINE Login が設定されていません。環境変数を確認してください。
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={handleLineLogin}
      disabled={disabled || isLoading}
      className={getButtonClasses()}
      type="button"
    >
      {showIcon && (
        <svg 
          className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''} ${customText || getButtonText() ? 'mr-2' : ''}`}
          viewBox="0 0 24 24" 
          fill="currentColor"
        >
          {isLoading ? (
            // Loading spinner
            <path d="M12 2C13.1 2 14 2.9 14 4V8C14 9.1 13.1 10 12 10S10 9.1 10 8V4C10 2.9 10.9 2 12 2M21 11H17C15.9 11 15 11.9 15 13S15.9 15 17 15H21C22.1 15 23 14.1 23 13S22.1 11 21 11M3 13C3 11.9 3.9 11 5 11H9C10.1 11 11 11.9 11 13S10.1 15 9 15H5C3.9 15 3 14.1 3 13M12 22C10.9 22 10 21.1 10 20V16C10 14.9 10.9 14 12 14S14 14.9 14 16V20C14 21.1 13.1 22 12 22Z" />
          ) : (
            // LINE icon
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.628-.629.628M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.594.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
          )}
        </svg>
      )}
      {getButtonText()}
    </button>
  );
};

export default LineLoginButton;