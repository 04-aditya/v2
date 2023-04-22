import { Box, Button, Card, CardActionArea, CardActions, CardContent, CardHeader, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, FormControlLabel, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useAuth from 'psnapi/useAuth';
import LogoutButton from 'sharedui/components/LogoutButton';
//import LogoutButton from '../../components/LogoutButton';
import React from 'react';
import KeyIcon from '@mui/icons-material/Key';
//import { TermsNotice } from '../terms-page/terms-page';
import useAxiosPrivate from 'psnapi/useAxiosPrivate';
import ReactMarkdown from 'react-markdown';

/* eslint-disable-next-line */
export interface LoginProps {}

export function Login(props: LoginProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const axios = useAxiosPrivate();
  const {auth, setAuth} = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const from = global.window.location.href;
  const [acceptedTerms, setAcceptTerms] = React.useState(false);
  const [openTermsDialog, setOpenTermsDialog] = React.useState(false);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  const handleClickOpenTermsDialog = () => {
    setOpenTermsDialog(true);
  };

  const handleCloseTermsDialog = () => {
    setOpenTermsDialog(false);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAcceptTerms(event.target.checked);
  };

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
      if (!response.data) return;
      console.log('got new refresh token');
      const data = response.data;
      const accessToken = data?.accessToken;
      const user = data?.user;
      setAuth({ user, accessToken })
      navigate('/');
    })
    .catch(ex=>{
      console.error(ex);
      setError('Invalid code. Please try again')
    })
    .finally(() => {
      setBusy(false);
    });
  },[location.search, navigate, setAuth, axios]);

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
      {busy? <CircularProgress/> : (
        <Card sx={{maxWidth:'100%', minWidth:345}} elevation={6}>
          <CardHeader title={'Login'} >
          </CardHeader>
          <Divider/>
          <CardContent>
            <Typography variant='body1'>I have read the <u onClick={handleClickOpenTermsDialog}>terms and conditions</u> for using this website.</Typography>
            <FormControlLabel control={<Checkbox checked={acceptedTerms} onChange={handleChange} />} label="I Agree" />
            <Dialog
              fullScreen={fullScreen}
              open={openTermsDialog}
              onClose={handleCloseTermsDialog}
              aria-labelledby="terms-dialog-title"
            >
              <DialogTitle id="terms-dialog-title">
                {"PSNext Terms & Conditions"}
              </DialogTitle>
              <DialogContent>
                <p>Terms & Conditions</p>
                <ReactMarkdown>{`
Thanks for using PSNext! Our mission is to unleash your productivity by providing you with a
helpful data for ypu and your teams to help you with your day to day job.
You can use PSNext, but you need to follow security and privacy rules, as well as any laws that apply.

Our [Employee Privacy Policy](https://lion.app.box.com/v/PG-Staff-HR-PrivacyNotice) explains how we collect and use your information,
our [Acceptable Use Guidelines](https://lion.box.com/v/AIAcceptableUse) outline your responsibilities when using our Services,
and our [Security & Data Privacy Policies](https://lion.box.com/v/DataPrivacyAndSecurityPolicies) explain our overall security and privacy program policies.
Please click agree below only if you agree with all these and the rules above.
`}</ReactMarkdown>
              </DialogContent>
              <DialogActions>
                <Button autoFocus onClick={()=>{setAcceptTerms(false); handleCloseTermsDialog()}}>
                  Disagree
                </Button>
                <Button onClick={()=>{setAcceptTerms(true); handleCloseTermsDialog()}} autoFocus>
                  Agree
                </Button>
              </DialogActions>
            </Dialog>
          </CardContent>
          <CardActions>
            <Button
              href={`${process.env['NX_API_URL']}/auth/login?redirect_url=${from}`}
              disabled={busy||!acceptedTerms}
              variant="contained"
              color='primary'
              sx={{color:'white'}}
              startIcon={<KeyIcon />}
            >
              Login
            </Button>
          </CardActions>
        </Card>
          )}
    </Box>
  );
}

export default Login;
