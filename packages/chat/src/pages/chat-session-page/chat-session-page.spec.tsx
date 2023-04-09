import { render } from '@testing-library/react';

import ChatSessionPage from './chat-session-page';

describe('ChatSessionPage', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<ChatSessionPage />);
    expect(baseElement).toBeTruthy();
  });
});
