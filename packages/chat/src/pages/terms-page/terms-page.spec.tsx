import { render } from '@testing-library/react';

import TermsPage from './terms-page';

describe('TermsPage', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<TermsPage />);
    expect(baseElement).toBeTruthy();
  });
});
