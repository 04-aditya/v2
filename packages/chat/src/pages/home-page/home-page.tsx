import { useNavigate } from 'react-router-dom';
import { Card, Divider, Grid, Paper, Stack, Typography } from '@mui/material';
import styles from './home-page.module.css';
import { ChatTextField } from '../../components/ChatTextField';

export function HomePage() {
  const navigate = useNavigate();
  return (
    <Paper elevation={4}
      sx={{display:'flex', height:'100%', flexDirection:'column', justifyContent:'space-between', p:1}}>

      <img src='/assets/appicon.svg' alt='app icon' height={100}/>
      <Typography variant='h3' sx={{width:'100%', textAlign:'center'}}>Welcome to {process.env['NX_APP_NAME']}!</Typography>
      <Grid container spacing={2} sx={{justifyContent:'center',p:1, px:2, flexGrow:1,my:2}} className={'scrollbarv'} >
        <Grid item xs={12} sm={12} md={4}>
          <Paper sx={{width:'100%', height:'100%', p:1}} elevation={4}>
            <Typography variant='button' color='primary'>Examples</Typography>
            <Divider/>

          </Paper>
        </Grid>
        <Grid item xs={12} sm={12} md={4}>
          <Paper sx={{width:'100%', minHeight:200, height:'100%', p:1}} elevation={4}>
            <Typography variant='button' color='secondary'>Favourites</Typography>
            <Divider/>

          </Paper>
        </Grid>
        <Grid item xs={12} sm={12} md={4}>
          <Paper sx={{width:'100%', height:'100%', p:1}} elevation={4}>
            <Typography variant='button' color='success'>Templates</Typography>
            <Divider/>

          </Paper>
        </Grid>
      </Grid>
      <Stack direction={'row'} spacing={1} sx={{height:24, justifyContent:'center'}}>
        <a href='/terms' target='_blank' rel='noreferrer' style={{fontSize:'0.75em', color:'gray'}}>Terms of Service</a>
        &nbsp;
        <a href='/privacy' target='_blank' rel='noreferrer' style={{fontSize:'0.75em', color:'gray'}}>Privacy Policy</a>
      </Stack>
      <ChatTextField onSuccess={(newSession)=>navigate(`/chat/${newSession.id}`)}/>
    </Paper>
  );
}
export default HomePage;
