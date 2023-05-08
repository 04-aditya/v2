import { render } from '@testing-library/react';

import ReleasesPage from './releases-page';

describe('ReleasesPage', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<ReleasesPage />);
    expect(baseElement).toBeTruthy();
  });
});
