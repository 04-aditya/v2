import { Link, useNavigate } from 'react-router-dom';
import { Box, Card, Divider, Grid, Paper, Stack, Typography, alpha } from '@mui/material';
import styles from './home-page.module.css';
import { ChatTextField } from '../../components/ChatTextField';
import ChatSessionList, { ChatSessions } from '../../components/ChatSessionList';
import ForumIcon from '@mui/icons-material/Forum';
import ChatStatsList from '../../components/StatsList';

export function HomePage() {
  const navigate = useNavigate();
  return (
    <Paper elevation={4}
      sx={theme=>({display:'flex', height:'100%', backgroundColor: alpha(theme.palette.background.paper, 0.5),
        flexDirection:'column', justifyContent:'space-between', p:1})}>

      <img src='/assets/appicon.svg' alt='app icon' height={100}/>
      <Typography variant='h3' sx={{width:'100%', textAlign:'center'}}>Welcome to {process.env['NX_APP_NAME']}!</Typography>

      <Divider sx={{my:2}}/>

      <Box sx={{ml:2, mr:3}}>
        <ChatTextField onSuccess={(newSession)=>navigate(`/chat/${newSession.id}`)}/>
      </Box>

      <Grid container spacing={2} sx={{justifyContent:'center',p:1, px:2, flexGrow:1,my:2}} className={'scrollbarv'} >
        <Grid item xs={12} sm={12} md={4}>
          <Paper sx={{width:'100%', height:'100%', p:1}} elevation={4}>
            <Typography variant='button' color='primary'>Shared</Typography>
            <Divider/>
            <ChatSessions type='public' show={'user'} icon={<ForumIcon sx={{color:'#999'}}/>}/>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={12} md={4}>
          <Paper sx={{width:'100%', minHeight:200, height:'100%', p:1}} elevation={4}>
            <Typography variant='button' color='secondary'>Favourites</Typography>
            <Divider/>
            <ChatSessions type='favourite' icon={<ForumIcon sx={{color:'#999'}}/>}/>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={12} md={4}>
          <Paper sx={{width:'100%', height:'100%', p:1}} elevation={4}>
            <Typography variant='button' color='success'>Stats</Typography>
            <Divider/>
            <ChatStatsList/>
          </Paper>
        </Grid>
      </Grid>
      <Stack direction={'row'} spacing={1} sx={{height:24, justifyContent:'center'}}>
        <Link to='/terms' style={{fontSize:'0.75em', color:'gray'}}>Terms of Service</Link>
        &nbsp;
        <Link to='https://lion.box.com/v/DataPrivacyAndSecurityPolicies' style={{fontSize:'0.75em', color:'gray'}}>Privacy Policy</Link>
      </Stack>
    </Paper>
  );
}
export default HomePage;
