import { render } from '@testing-library/react';

import DevSettings from './devsettings';

describe('DevSettings', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<DevSettings />);
    expect(baseElement).toBeTruthy();
  });
});
