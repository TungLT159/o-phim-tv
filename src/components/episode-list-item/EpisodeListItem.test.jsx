import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { FocusProvider } from '../../context/FocusContext';
import EpisodeListItem from './EpisodeListItem';

jest.mock('@noriginmedia/norigin-spatial-navigation', () => {
  const React = require('react');
  const registry = new Map();

  const setFocus = jest.fn((focusKey) => {
    registry.get(focusKey)?.focus?.();
    return Promise.resolve();
  });

  return {
    __esModule: true,
    destroy: jest.fn(() => registry.clear()),
    doesFocusableExist: jest.fn((focusKey) => registry.has(focusKey)),
    getCurrentFocusKey: jest.fn(() => null),
    init: jest.fn(),
    setFocus,
    useFocusable: jest.fn(({ focusKey } = {}) => {
      const ref = React.useRef(null);

      React.useEffect(() => {
        if (!focusKey || !ref.current) return undefined;
        registry.set(focusKey, ref.current);
        return () => registry.delete(focusKey);
      });

      return {
        ref,
        focused: false,
        hasFocusedChild: false,
        focusKey,
        focusSelf: () => setFocus(focusKey),
      };
    }),
  };
});

const mockEpisode = {
  name: 'Tập 1',
  slug: 'tap-1',
  duration: '45 phút',
  description: 'Mô tả tập phim',
};

describe('EpisodeListItem', () => {
  it('renders episode information', () => {
    render(
      <FocusProvider>
        <EpisodeListItem
          episode={mockEpisode}
          zone={1}
          row={0}
          col={0}
        />
      </FocusProvider>
    );

    expect(screen.getAllByText('Tập 1').length).toBeGreaterThan(0);
    expect(screen.getByText('45 phút')).toBeInTheDocument();
    expect(screen.getByText('Mô tả tập phim')).toBeInTheDocument();
  });

  it('applies current class when isCurrent is true', () => {
    const { container } = render(
      <FocusProvider>
        <EpisodeListItem
          episode={mockEpisode}
          zone={1}
          row={0}
          col={0}
          isCurrent={true}
        />
      </FocusProvider>
    );

    expect(container.querySelector('.episode-list-item--current')).toBeTruthy();
  });

  it('does not render thumbnail element', () => {
    const { container } = render(
      <FocusProvider>
        <EpisodeListItem
          episode={mockEpisode}
          zone={1}
          row={0}
          col={0}
        />
      </FocusProvider>
    );

    expect(container.querySelector('.episode-list-item__thumbnail')).toBeFalsy();
  });
});
