import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './tv-sidebar.scss';
import logo from '../../assets/logo.png';
import { headerNav } from '../../constants/navigationData';
import { useFocusable, useFocus } from '../../context/FocusContext';

const ICONS = {
  'Quốc Gia': 'bx-globe',
  'Thể Loại': 'bx-category',
  search: 'bx-search-alt-2',
};

function SidebarItem({ to, icon, label, row, ...props }) {
  const { ref, focused } = useFocusable(0, row, 0);
  const isLink = !!to;

  const className = `tv-sidebar__item ${focused ? 'tv-sidebar__item--focused' : ''} ${props.className || ''}`;

  if (isLink) {
    return (
      <Link to={to} ref={ref} className={className}>
        {icon && <i className={`bx ${icon}`} aria-hidden="true" />}
        <span>{label}</span>
        {props.children}
      </Link>
    );
  }

  return (
    <button type="button" ref={ref} className={className} {...props}>
      {icon && <i className={`bx ${icon}`} aria-hidden="true" />}
      <span>{label}</span>
      {props.children}
    </button>
  );
}

function SidebarSubitem({ to, label, row, onClick }) {
  const { ref, focused } = useFocusable(0, row, 0);
  return (
    <Link
      to={to}
      ref={ref}
      className={`tv-sidebar__subitem ${focused ? 'tv-sidebar__subitem--focused' : ''}`}
      role="menuitem"
      onClick={onClick}
    >
      <span>{label}</span>
    </Link>
  );
}

const TvSidebar = () => {
  const { state } = useFocus();
  const [expanded, setExpanded] = useState(false);
  const [focusedCategory, setFocusedCategory] = useState(null);
  const sidebarRef = useRef(null);

  const isSidebarFocused = state.zone === 0;

  useEffect(() => {
    if (isSidebarFocused) {
      setExpanded(true);
    } else {
      setExpanded(false);
    }
  }, [isSidebarFocused]);

  const handleCategoryFocus = useCallback((index) => {
    setFocusedCategory(index);
  }, []);

  const isActive = (catDisplay) => {
    const cat = headerNav.find(c => c.display === catDisplay);
    return cat?.submenu?.some(sub => window.location.pathname.startsWith(sub.path));
  };

  let itemRow = 0; // row counter for sidebar items
  let subRow = 0;

  return (
    <nav
      ref={sidebarRef}
      className={`tv-sidebar ${expanded ? 'tv-sidebar--expanded' : ''}`}
      aria-label="Điều hướng TV"
    >
      <div className="tv-sidebar__bg" />
      <div className="tv-sidebar__inner">
        <div className="tv-sidebar__logo">
          <Link to="/" tabIndex="-1" aria-label="Trang chủ">
            <img src={logo} alt="O Phim" />
            <span>Ổ Phim</span>
          </Link>
        </div>

        <div className="tv-sidebar__nav">
          <SidebarItem to="/" icon="bxs-home" label="Trang chủ" row={itemRow++} className="tv-sidebar__item--home" />

          {headerNav.filter(c => c.display !== 'Danh sách').map((category) => {
            const catRow = itemRow++;
            subRow = catRow + 100; // offset for subitems

            return (
              <div key={category.display} className={`tv-sidebar__category ${focusedCategory === catRow && expanded ? 'tv-sidebar__category--expanded' : ''} ${isActive(category.display) ? 'tv-sidebar__category--active' : ''}`}>
                <SidebarItem
                  icon={ICONS[category.display] || 'bx-collection'}
                  label={category.display}
                  row={catRow}
                  className="tv-sidebar__item--category"
                  onFocus={() => handleCategoryFocus(catRow)}
                  aria-expanded={focusedCategory === catRow && expanded}
                  aria-haspopup="true"
                >
                  <i className={`bx bx-chevron-${focusedCategory === catRow && expanded ? 'down' : 'right'} tv-sidebar__arrow`} aria-hidden="true" />
                </SidebarItem>

                <div className="tv-sidebar__submenu" role="menu">
                  {category.submenu?.map((sub, idx) => (
                    <SidebarSubitem
                      key={sub.path}
                      to={sub.path}
                      label={sub.display}
                      row={subRow + idx}
                      onClick={() => setExpanded(false)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          <SidebarItem to="/tim-kiem" icon={ICONS.search} label="Tìm kiếm" row={itemRow++} className="tv-sidebar__item--search" />
        </div>
      </div>

      {expanded && <div className="tv-sidebar__overlay" aria-hidden="true" />}
    </nav>
  );
};

export default TvSidebar;
