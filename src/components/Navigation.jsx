import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Button from './Button';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedMenus, setExpandedMenus] = useState({ 
    interviews: true, 
    teaching: true 
  });

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
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
  ];

  const isActive = (path) => location.pathname.startsWith(path);
  const isParentActive = (subItems) => subItems.some(item => isActive(item.path));

  return (
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
  );
};

export default Navigation;
 