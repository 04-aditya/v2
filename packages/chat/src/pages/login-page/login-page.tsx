import { Box, Button, CircularProgress } from '@mui/material';
import styles from './login-page.module.css';
import LoginCard from 'sharedui/components/LoginCard';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from "psnapi/axios";
import useAuth from 'psnapi/useAuth';
/* eslint-disable-next-line */
export interface LoginPageProps {}

export function LoginPage(props: LoginPageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const {setAuth} = useAuth();
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
      navigate('/', { replace: true });
    } )
    .catch(ex=>{
      console.error(ex);
      setError('Invalid code. Please try again')
    })
    .finally(() => {
      setBusy(false);
    });
  },[location.search]);

  return (
    <Box className={styles['container']} sx={{display:'flex', height:'100%',justifyContent:'center', alignItems:'center'}}>
      {busy? <CircularProgress/> : (
        <Button
          href={`${process.env['NX_API_URL']}/auth/login?redirect_url=${global.window.location.href}`}
          disabled={busy}
          variant="contained"
          color='primary'
        >
          Login
        </Button>
          )}
    </Box>
  );
}

export default LoginPage;
