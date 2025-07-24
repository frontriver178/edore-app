import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from './Button';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState({ 
    interviews: true, 
    teaching: true
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMobileMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      console.log('ログアウトボタンがクリックされました');
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  const toggleMenu = (menuKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const menuItems = [
    { path: '/students', label: '生徒管理' },
    { path: '/teachers', label: '講師管理' },
    { path: '/tasks', label: 'タスク管理' },
    { 
      key: 'interviews',
      label: '面談',
      subItems: [
        { path: '/interview-schedules', label: '面談スケジュール' },
        { path: '/student-interviews', label: '面談記録' }
      ]
    },
    { 
      key: 'teaching',
      label: '指導',
      subItems: [
        { path: '/teaching-schedules', label: '指導スケジュール' },
        { path: '/teaching-records', label: '指導記録' }
      ]
    },
    { path: '/mock-exams', label: '模試結果' },
    { path: '/mypage', label: 'マイページ' },
  ];

  const isActive = (path) => location.pathname.startsWith(path);
  const isParentActive = (subItems) => subItems.some(item => isActive(item.path));

  return (
    <>
      {/* モバイルヘッダー */}
      <div className="mobile-header">
        <button 
          className="hamburger-menu"
          onClick={toggleMobileMenu}
          aria-label="メニューを開く"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <h1 className="mobile-title">Edore</h1>
      </div>
      {isMenuOpen && (
        <div className="mobile-menu-overlay" onClick={closeMobileMenu}></div>
      )}
      
      {/* PC版サイドバー */}
      <div className="sidebar">
        <nav>
          <h1>Edore</h1>
          <ul>
            {menuItems.map((item) => {
              if (item.subItems) {
                // サブメニューがある場合
                const isExpanded = expandedMenus[item.key];
                const isItemActive = isParentActive(item.subItems);
                
                return (
                  <li key={item.key}>
                    <div 
                      className={`menu-parent ${isItemActive ? 'active' : ''}`}
                      onClick={() => {
                        console.log('メニュークリック:', item.label);
                        toggleMenu(item.key);
                      }}
                    >
                      <span>{item.label}</span>
                      <span className={`arrow ${isExpanded ? 'expanded' : ''}`}>▼</span>
                    </div>
                    {isExpanded && (
                      <ul className="sub-menu">
                        {item.subItems.map((subItem) => (
                          <li key={subItem.path}>
                            <Link
                              to={subItem.path}
                              className={isActive(subItem.path) ? 'active' : ''}
                              onClick={() => console.log('リンククリック:', subItem.path)}
                            >
                              {subItem.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              } else {
                // 通常のメニュー項目
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={isActive(item.path) ? 'active' : ''}
                      onClick={() => console.log('リンククリック:', item.path)}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              }
            })}
          </ul>
          <div className="mt-auto">
            <Button 
              variant="logout" 
              onClick={handleLogout}
            >
              ログアウト
            </Button>
          </div>
        </nav>
      </div>
      
      {/* モバイル版ナビゲーション */}
      <nav className={`navigation mobile ${isMenuOpen ? 'open' : ''}`}>
        <div className="nav-content">
          <ul>
              {menuItems.map((item) => {
                if (item.subItems) {
                  // サブメニューがある場合
                  const isExpanded = expandedMenus[item.key];
                  const isItemActive = isParentActive(item.subItems);
                  
                  return (
                    <li key={item.key}>
                      <div 
                        className={`menu-parent ${isItemActive ? 'active' : ''}`}
                        onClick={() => toggleMenu(item.key)}
                      >
                        <span>{item.label}</span>
                        <span className={`arrow ${isExpanded ? 'expanded' : ''}`}>▼</span>
                      </div>
                      {isExpanded && (
                        <ul className="sub-menu">
                          {item.subItems.map((subItem) => (
                            <li key={subItem.path}>
                              <Link
                                to={subItem.path}
                                className={isActive(subItem.path) ? 'active' : ''}
                                onClick={closeMobileMenu}
                              >
                                {subItem.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                } else {
                  // 通常のメニュー項目
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={isActive(item.path) ? 'active' : ''}
                        onClick={closeMobileMenu}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                }
              })}
          </ul>
          <div className="mt-auto">
            <Button 
              variant="logout" 
              onClick={handleLogout}
            >
              ログアウト
            </Button>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navigation;
 