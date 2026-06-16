import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './tv-sidebar.scss';
import logo from '../../assets/logo.png';
import { useFocusable, useFocus } from '../../context/FocusContext';

function SidebarItem({ to, icon, label, row, ...props }) {
  const { ref, focused } = useFocusable(0, row, 0);

  const className = `tv-sidebar__item ${focused ? 'tv-sidebar__item--focused' : ''} ${props.className || ''}`;

  if (to) {
    return (
      <Link to={to} ref={ref} className={className}>
        {icon && <i className={`bx ${icon}`} aria-hidden="true" />}
        <span>{label}</span>
      </Link>
    );
  }
  return null;
}

const TvSidebar = () => {
  const { state } = useFocus();
  const [expanded, setExpanded] = useState(false);
  const sidebarRef = useRef(null);

  const isSidebarFocused = state.zone === 0;

  useEffect(() => {
    setExpanded(isSidebarFocused);
  }, [isSidebarFocused]);

  let itemRow = 0;

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
          <SidebarItem to="/tim-kiem" icon="bx-search-alt-2" label="Tìm kiếm" row={itemRow++} className="tv-sidebar__item--search" />
        </div>
      </div>

      {expanded && <div className="tv-sidebar__overlay" aria-hidden="true" />}
    </nav>
  );
};

export default TvSidebar;
