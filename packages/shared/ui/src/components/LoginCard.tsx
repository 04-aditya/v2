import { Alert, Box, Button, Card, CardActions, CardContent, CardHeader, CardProps, CircularProgress, Divider, InputAdornment, Link, Stack, TextField } from "@mui/material";
import axios from "psnapi/axios";
import useAuth from "psnapi/useAuth";
import { useState, useRef, useEffect, ChangeEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import AppRegistrationIcon from '@mui/icons-material/AppRegistration';
import useRefreshToken from "psnapi/useRefreshToken";

const LOGIN_URL = '/auth/requestaccess';
const VERIFY_URL = '/auth/gettoken';

export type LoginCardProps = CardProps & {
  bannerUrl?: string;
}

export default function LoginCard(props: LoginCardProps) {
  const {bannerUrl, ...rest} = props;

  const { auth, setAuth } = useAuth();
  const refresh = useRefreshToken();
  const [email, setEmail] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [codeEntry, showCodeEntry] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const inputRef = useRef<HTMLInputElement>();

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
    // try {
    //   refresh();
    // } catch(ex) {
    //   console.error(ex);
    // }
  }, [])

  function validateEmail(email:string) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }
  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>)=>{
    const newEmail = e.target.value;

    if (newEmail.length > 48 || newEmail.split('@').length>2) {
      return setError('Invalid email');
    } else {
      setEmail(newEmail);
      setError('');
    }
  }

  const handleCodeChange = (e: ChangeEvent<HTMLInputElement>)=>{
    const newCode = e.target.value;
    if (newCode.length>10) {
      setError('Invalid code');
    } else {
      setCode(e.target.value);
      setError('');
    }
  }

  const onGenerateCode = async ()=>{
    try {
      setBusy(true);
      setError('');
      await axios.post(
        LOGIN_URL,
        JSON.stringify({email}),
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        }
      );
      setError('');
      showCodeEntry(true);
    } catch(ex) {
      console.error(ex);
      setError('Invalid email. Please try again')
    } finally {
      setBusy(false);
    }
  }

  const onVerifyCode = async ()=>{
    try {
      setBusy(true);
      setError('')
      const response = await axios.post(
        VERIFY_URL,
        JSON.stringify({email, code}),
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        }
      );
      setBusy(false);
      if (response.status!==200) return;
      const data = await response.data;
      const accessToken = data?.accessToken;
      const user = data?.user;
      setAuth({ user, accessToken });
      navigate(from, { replace: true });
    } catch(ex) {
      console.error(ex);
      setError('Invalid code. Please try again')
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card sx={{maxWidth:'100%', minWidth:345}} elevation={6} {...rest}>
      <CardHeader title='Login' >
      </CardHeader>
      <Divider/>
      <CardContent>
      {codeEntry? (
        <TextField fullWidth focused
          id="code"
          label="Code"
          type='number'

          value={code}
          onChange={handleCodeChange}
          error={code===''}
          helperText="Please enter the code sent to the email"
          InputProps={{
            ref: inputRef,
            onKeyUp: e => { e.key==='Enter' && onVerifyCode() },
            startAdornment: (
              <InputAdornment position="start">
                <AppRegistrationIcon />
              </InputAdornment>
            ),
          }}
          variant="standard"
        />
        ):<TextField fullWidth focused
          id="email"
          label="Email"
          type='email'
          value={email}
          onChange={handleEmailChange}
          error={email===''}
          helperText={`Please use your @${process.env['NX_EMAILDOMAINS']} email`}
          InputProps={{
            ref: inputRef,
            onKeyUp: e => {e.key==='Enter' && onGenerateCode()},
            startAdornment: (
              <InputAdornment position="start">
                <MailOutlineIcon />
              </InputAdornment>
            ),
          }}
          variant="standard"
        />}
        {error !== '' ? <Alert severity="error">{error}</Alert> : null}
      </CardContent>
      <CardActions><Box sx={{position: 'relative'}}>
          {codeEntry? (
            <Button size="small" onClick={onVerifyCode} disabled={busy}>Verify</Button>
          ):(
            <Button size="small" onClick={onGenerateCode} disabled={busy}>Generate Code</Button>
          )}
          {busy && (
            <CircularProgress
              size={24}
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                marginTop: '-12px',
                marginLeft: '-12px',
              }}
            />
          )}
        </Box>
        {/*
          <Button href={`${process.env['NX_API_URL']}/auth/ssologin?redirect_url=${global.window.location.href}`}>Login with SSO</Button>
        */}
      </CardActions>
    </Card>
  );
}
