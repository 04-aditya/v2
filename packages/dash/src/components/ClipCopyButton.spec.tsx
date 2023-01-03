import { render, fireEvent } from '@testing-library/react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import React from 'react';
import { ClipCopyButton } from './ClipCopyButton';

describe('CopyButton', () => {
  it('displays the correct icon', () => {
    const { getByRole } = render(<ClipCopyButton text="Text to be copied" />);
    const button = getByRole('button');

    expect(button).toBeTruthy()
    expect(getByRole('img', { name: 'Copy' })).toBeTruthy();
  });

  it('copies the text to the clipboard when clicked', () => {
    jest.spyOn(navigator.clipboard, 'writeText');

    const { getByRole } = render(<ClipCopyButton text="Text to be copied" />);
    const button = getByRole('button');

    fireEvent.click(button);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Text to be copied');
  });

  it('displays a snackbar when the text is copied', () => {
    const { getByRole, getByText } = render(<ClipCopyButton text="Text to be copied" />);
    const button = getByRole('button');

    fireEvent.click(button);

    expect(getByText('Copied "Text to be copied" to clipboard')).toBeTruthy();
  });
});
