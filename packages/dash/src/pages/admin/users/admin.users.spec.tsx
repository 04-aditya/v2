import { render } from '@testing-library/react';

import AdminUsers from './admin.users';

describe('AdminUsers', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<AdminUsers />);
    expect(baseElement).toBeTruthy();
  });
});
