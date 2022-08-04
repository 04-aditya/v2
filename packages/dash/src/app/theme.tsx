import { createTheme, responsiveFontSizes } from '@mui/material/styles';

let theme = createTheme({
  typography: {
    fontSize: 14
  }
});
theme = responsiveFontSizes(theme);

export { theme };
