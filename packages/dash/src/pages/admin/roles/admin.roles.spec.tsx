import { render } from '@testing-library/react';

import AdminRoles from './admin.roles';

describe('AdminRoles', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<AdminRoles />);
    expect(baseElement).toBeTruthy();
  });
});
