import { PaletteMode } from '@mui/material';
import { Theme } from '@mui/material/styles';

export const getDesignTokens = (mode: PaletteMode) => ({
  typography: {
    fontSize: 14,
    fontFamily: '"Futura Next Book", "Roboto", "Arial", "sans-serif"',
    body1: {
      // fontFamily: 'Minion Pro',
    },
    body2: {
      fontFamily: 'Minion Pro',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (themeParam: Theme) => (mode === 'light'?`
        *::-webkit-scrollbar-thumb {
          background-color: #d6d6d6;
          border-radius: 20px;
          border: 1px solid #fff;
        }
      `:`
        *::-webkit-scrollbar-thumb {
          background-color: #4b4b4b;
          border-radius: 20px;
          border: 1px solid #333;
        }
      `),
    },
  },
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          // palette values for light mode
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
            primary: '#030303',
          },
          divider: '#e0e0e0',
          background:{
            paper: '#fff',
            default: '#EEEEEE',
          }
        }
      : {
          // palette values for dark mode
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
            primary: '#eeeeee',
          },
          divider: '#222',
          background:{
            paper: '#000',
            default: '#030303',
          }
        }),
  },
});
