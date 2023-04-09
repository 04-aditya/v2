import { useNavigate } from 'react-router-dom';
import { Paper, Typography } from '@mui/material';
import styles from './home-page.module.css';
import { ChatTextField } from '../../components/ChatTextField';

export function HomePage() {
  const navigate = useNavigate();
  return (
    <Paper className={styles['container']} elevation={4}
      sx={{display:'flex', height:'100%', flexDirection:'column', justifyContent:'space-between', p:1}}>

      <Typography variant='h3' sx={{width:'100%', textAlign:'center'}}>Welcome to {process.env['NX_APP_NAME']}!</Typography>
      <ChatTextField onSuccess={(newSession)=>navigate(`/chat/${newSession.id}`)}/>
    </Paper>
  );
}
export default HomePage;
