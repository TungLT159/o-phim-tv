import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ThumbnailPreview from './ThumbnailPreview';

describe('ThumbnailPreview', () => {
  it('renders nothing when not visible', () => {
    const { container } = render(
      <ThumbnailPreview visible={false} dataURL="" time={0} position={50} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when dataURL is empty', () => {
    const { container } = render(
      <ThumbnailPreview visible={true} dataURL="" time={0} position={50} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders image and time when visible with dataURL', () => {
    render(
      <ThumbnailPreview
        visible={true}
        dataURL="data:image/jpeg;base64,test"
        time={65}
        position={50}
      />
    );
    expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/jpeg;base64,test');
    expect(screen.getByText('01:05')).toBeInTheDocument();
  });

  it('positions at given percentage', () => {
    const { container } = render(
      <ThumbnailPreview
        visible={true}
        dataURL="data:image/jpeg;base64,test"
        time={0}
        position={75}
      />
    );
    const el = container.firstChild;
    expect(el.style.left).toBe('75%');
  });

  it('formats hours correctly', () => {
    render(
      <ThumbnailPreview
        visible={true}
        dataURL="data:image/jpeg;base64,test"
        time={3725}
        position={0}
      />
    );
    expect(screen.getByText('1:02:05')).toBeInTheDocument();
  });
});
