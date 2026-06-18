import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { FocusProvider } from '../../context/FocusContext';
import EpisodeListItem from './EpisodeListItem';

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

  it('shows placeholder when no thumbnail', () => {
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

    expect(container.querySelector('.episode-list-item__thumbnail-placeholder')).toBeTruthy();
  });
});
