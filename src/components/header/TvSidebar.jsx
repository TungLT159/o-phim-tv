import React, { useCallback, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import './tv-sidebar.scss';
import logo from '../../assets/logo.png';
import { FOCUS_KEYS, useFocus, useFocusable } from '../../context/FocusContext';

function SidebarItem({ to, icon, label, focusKey, onFocusedChange, onArrowRight, ...props }) {
  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: () => ref.current?.click?.(),
    onArrowPress: (direction) => {
      if (direction !== 'right') return true;
      return onArrowRight?.() ? false : true;
    },
    onFocus: () => onFocusedChange?.(true),
    onBlur: () => onFocusedChange?.(false),
  });
  const handleKeyDown = useCallback((event) => {
    if (event.key !== 'ArrowRight') return;

    if (onArrowRight?.()) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, [onArrowRight]);

  const className = `tv-sidebar__item ${focused ? 'tv-sidebar__item--focused' : ''} ${props.className || ''}`;

  if (to) {
    return (
      <Link to={to} ref={ref} className={className} data-focus-key={focusKey} onKeyDown={handleKeyDown}>
        {icon && <i className={`bx ${icon}`} aria-hidden="true" />}
        <span>{label}</span>
      </Link>
    );
  }
  return null;
}

const TvSidebar = () => {
  const [expanded, setExpanded] = useState(false);
  const sidebarRef = useRef(null);
  const { restoreContentFocus } = useFocus();

  return (
    <nav
      ref={sidebarRef}
      className={`tv-sidebar ${expanded ? 'tv-sidebar--expanded' : ''}`}
      aria-label="Điều hướng TV"
    >
      <div className="tv-sidebar__bg" />
      <div className="tv-sidebar__inner">
        <div className="tv-sidebar__logo">
          <Link to="/" aria-label="Trang chủ">
            <img src={logo} alt="O Phim" />
            <span>Ổ Phim</span>
          </Link>
        </div>

        <div className="tv-sidebar__nav">
          <SidebarItem to="/" icon="bxs-home" label="Trang chủ" focusKey={`${FOCUS_KEYS.SIDEBAR}_HOME`} onFocusedChange={setExpanded} onArrowRight={restoreContentFocus} className="tv-sidebar__item--home" />
          <SidebarItem to="/tim-kiem" icon="bx-search-alt-2" label="Tìm kiếm" focusKey={`${FOCUS_KEYS.SIDEBAR}_SEARCH`} onFocusedChange={setExpanded} onArrowRight={restoreContentFocus} className="tv-sidebar__item--search" />
        </div>
      </div>

      {expanded && <div className="tv-sidebar__overlay" aria-hidden="true" />}
    </nav>
  );
};

export default TvSidebar;
