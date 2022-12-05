import { render } from '@testing-library/react';

import AdminPerms from './admin.permissions';

describe('AdminPerms', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<AdminPerms />);
    expect(baseElement).toBeTruthy();
  });
});
