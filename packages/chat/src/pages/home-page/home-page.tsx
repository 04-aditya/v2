import { Box, Paper, TextField, Typography } from '@mui/material';
import styles from './home-page.module.css';
import TelegramIcon from '@mui/icons-material/Telegram';
import IconButton from '@mui/material/IconButton';

/* eslint-disable-next-line */
export interface HomePageProps {}

export function HomePage(props: HomePageProps) {
  return (
    <Paper className={styles['container']} elevation={4}
      sx={{display:'flex', height:'100%', flexDirection:'column', justifyContent:'space-between', p:1}}>

      <Typography variant='h3' sx={{width:'100%', textAlign:'center'}}>Welcome to {process.env['NX_APP_NAME']}!</Typography>

      <TextField fullWidth variant="filled"
          name='message'
          placeholder="Type your message here..."
          InputProps={{
            endAdornment: <IconButton><TelegramIcon color="primary"/> </IconButton>
          }}
        />
    </Paper>
  );
}

export default HomePage;
