import { createTheme, responsiveFontSizes } from '@mui/material/styles';

let theme = createTheme({
  typography: {
    fontSize: 14
  },
  palette: {
    primary: {
      main: '#079fff',
    },
    secondary: {
      main: '#fe414d',
    },
    success: {
      main: '#00e6c3',
    },
    warning: {
      main: '#ffe63b',
    },
    text:{
      primary: 'rgba(58, 53, 65, 0.87)',
    },
    divider: '#e0e0e0',
    background:{
      paper: '#fff',
      default: '#EEEEEE', //'#F4F5FA',
    }
  },
});
theme = responsiveFontSizes(theme);

export { theme };
