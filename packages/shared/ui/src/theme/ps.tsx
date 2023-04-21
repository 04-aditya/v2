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
        a {
          color: #fe414d;
        }
        *::-webkit-scrollbar-thumb {
          background-color: #d6d6d6;
          border-radius: 20px;
          border: 1px solid #fff;
        }
        .message-content table {
          border: 1px solid lightgray;
          border-radius: 4px;
          padding: 4px;
          border-collapse: collapse;
        }
        .message-content th {
          background-color: #d6d6d6;
          border-top-width: 3px;
          border-top-style: solid;
          border-top-color: #b1b1b1;
        }
        .message-content tbody tr:nth-child(odd) {
          background-color: #eeeeee;
        }
        .message-content td {
          padding:4px
        }
      `:`
        a {
          color: #079fff;
        }
        *::-webkit-scrollbar-thumb {
          background-color: #4b4b4b;
          border-radius: 20px;
          border: 1px solid #333;
        }
        .message-content table {
          border: 1px solid #4b4b4b;
          border-radius: 4px;
          padding: 4px;
          border-collapse: collapse;
        }
        .message-content th {
          background-color: #4b4b4b;
          color: #EEE;
          border-top-width: 3px;
          border-top-style: solid;
          border-top-color: #828282;
        }
        .message-content tbody tr:nth-child(odd) {
          background-color: #030303;
        }
        .message-content td {
          padding:4px
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
