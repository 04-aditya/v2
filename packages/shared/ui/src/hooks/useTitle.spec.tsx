import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { useTitle } from './useTitle';

describe('useTitle', () => {
  it('updates the document title', () => {
    const initialTitle = 'Initial title';
    const newTitle = 'New title';

    function TestComponent() {
      const { updateTitle } = useTitle(initialTitle);
      return (
        <button onClick={() => updateTitle(newTitle)}>
          Update title
        </button>
      );
    }

    const { getByText } = render(<TestComponent />);
    expect(document.title).toBe(initialTitle);

    fireEvent.click(getByText('Update title'));
    expect(document.title).toBe(newTitle);
  });
});
