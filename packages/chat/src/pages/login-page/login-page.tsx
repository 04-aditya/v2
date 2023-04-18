import { Box, Button, CircularProgress, Typography } from '@mui/material';
import styles from './login-page.module.css';
import LoginCard from 'sharedui/components/LoginCard';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from "psnapi/axios";
import useAuth from 'psnapi/useAuth';
import LogoutButton from '../../components/LogoutButton';
/* eslint-disable-next-line */
export interface LoginPageProps {}

export function LoginPage(props: LoginPageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const {auth, setAuth} = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const from = location.state?.from?.pathname || "/";

  useEffect(()=>{
    if (location.search !== '?status=success') return;
      setBusy(true);
      setError('');
      axios.get(
        '/auth/refreshtoken',
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        }
      ).then(response => {
      setBusy(false);
      if (response.status!==200) return;
      const data = response.data;
      const accessToken = data?.accessToken;
      const user = data?.user;
      setAuth({ user, accessToken });
      navigate('/');
    } )
    .catch(ex=>{
      console.error(ex);
      setError('Invalid code. Please try again')
    })
    .finally(() => {
      setBusy(false);
    });
  },[location.search]);

  if (auth?.user) {
    return <Box sx={{display:'flex', flexDirection:'column', height:'100%',justifyContent:'center', alignItems:'center'}}>
      <Typography variant='h6'>Currently logged in as</Typography>
      <Typography variant='h5' color='primary'>{auth.user.email}</Typography>
      <br/>
      <Button onClick={()=>navigate('/')}>Continue.</Button>
      <Typography variant='caption'>-- or --</Typography>
      <LogoutButton color='secondary'>Logout</LogoutButton>
    </Box>
  }

  return (
    <Box sx={{display:'flex', flexDirection:'column', height:'100%',justifyContent:'center', alignItems:'center'}}>
      <LoginCard/><br/>
      {busy? <CircularProgress/> : (
        <Button
          href={`${process.env['NX_API_URL']}/auth/login?redirect_url=${global.window.location.href}`}
          disabled={busy}
          variant="contained"
          color='primary'
        >
          Login with SSO
        </Button>
          )}
    </Box>
  );
}

export default LoginPage;
