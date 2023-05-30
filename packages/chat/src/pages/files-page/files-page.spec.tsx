import { render } from '@testing-library/react';

import FilesPage from './files-page';

describe('FilesPage', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<FilesPage />);
    expect(baseElement).toBeTruthy();
  });
});
