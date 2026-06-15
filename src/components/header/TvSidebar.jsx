import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './tv-sidebar.scss';
import logo from '../../assets/logo.png';
import { headerNav } from '../../constants/navigationData';

const ICONS = {
  'Danh sách': 'bx-list-ul',
  'Quốc Gia': 'bx-globe',
  'Thể Loại': 'bx-category',
  search: 'bx-search-alt-2',
};

const TvSidebar = () => {
  const { pathname } = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [focusedCategory, setFocusedCategory] = useState(null);
  const sidebarRef = useRef(null);

  const activeIdx = headerNav.findIndex((e) =>
    e.submenu?.some((sub) => pathname.startsWith(sub.path))
  );

  useEffect(() => {
    const onFocusIn = (e) => {
      if (sidebarRef.current?.contains(e.target)) {
        setExpanded(true);
      } else {
        setExpanded(false);
      }
    };
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, []);

  const handleCategoryFocus = useCallback((index) => {
    setFocusedCategory(index);
  }, []);

  const isActive = (index) => activeIdx === index;

  return (
    <nav
      ref={sidebarRef}
      className={`tv-sidebar ${expanded ? 'tv-sidebar--expanded' : ''}`}
      aria-label="Điều hướng TV"
    >
      <div className="tv-sidebar__bg" />

      <div className="tv-sidebar__inner">
        <div className="tv-sidebar__logo">
          <Link to="/" tabIndex="0" aria-label="Trang chủ">
            <img src={logo} alt="O Phim" />
            <span>Ổ Phim</span>
          </Link>
        </div>

        <div className="tv-sidebar__nav">
          <Link
            to="/"
            className={`tv-sidebar__item tv-sidebar__item--home ${pathname === '/' ? 'tv-sidebar__item--active' : ''}`}
            tabIndex="0"
          >
            <i className="bx bxs-home" aria-hidden="true" />
            <span>Trang chủ</span>
          </Link>

          {headerNav.map((category, catIdx) => (
            <div
              key={category.display}
              className={`tv-sidebar__category ${focusedCategory === catIdx && expanded ? 'tv-sidebar__category--expanded' : ''} ${isActive(catIdx) ? 'tv-sidebar__category--active' : ''}`}
            >
              <button
                type="button"
                className="tv-sidebar__item tv-sidebar__item--category"
                tabIndex="0"
                onFocus={() => handleCategoryFocus(catIdx)}
                aria-expanded={focusedCategory === catIdx && expanded}
                aria-haspopup="true"
              >
                <i className={`bx ${ICONS[category.display] || 'bx-collection'}`} aria-hidden="true" />
                <span>{category.display}</span>
                <i className={`bx bx-chevron-${focusedCategory === catIdx && expanded ? 'down' : 'right'} tv-sidebar__arrow`} aria-hidden="true" />
              </button>

              <div className="tv-sidebar__submenu" role="menu">
                {category.submenu?.map((sub) => (
                  <Link
                    key={sub.path}
                    to={sub.path}
                    className={`tv-sidebar__subitem ${pathname.startsWith(sub.path) ? 'tv-sidebar__subitem--active' : ''}`}
                    tabIndex="0"
                    role="menuitem"
                    onFocus={() => handleCategoryFocus(catIdx)}
                  >
                    <span>{sub.display}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          <Link
            to="/tim-kiem"
            className="tv-sidebar__item tv-sidebar__item--search"
            tabIndex="0"
          >
            <i className={`bx ${ICONS.search}`} aria-hidden="true" />
            <span>Tìm kiếm</span>
          </Link>
        </div>
      </div>

      {expanded && <div className="tv-sidebar__overlay" aria-hidden="true" />}
    </nav>
  );
};

export default TvSidebar;
