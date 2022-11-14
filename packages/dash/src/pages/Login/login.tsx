import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Button, Card, CardActions, CardContent, CardHeader, CardMedia, InputAdornment, TextField, Typography } from '@mui/material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AccountCircle from '@mui/icons-material/AccountCircle';
import AppRegistrationIcon from '@mui/icons-material/AppRegistration';
import useAuth from '@hooks/useAuth';
import axios from '@/api/axios';

const LOGIN_URL = '/auth/requestaccess';
const VERIFY_URL = '/auth/gettoken';

/* eslint-disable-next-line */
export interface LoginProps {}

export function Login(props: LoginProps) {

  const { setAuth } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [codeEntry, showCodeEntry] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const inputRef = useRef<HTMLInputElement>();

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [])

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>)=>{
    setEmail(e.target.value);
  }

  const handleCodeChange = (e: ChangeEvent<HTMLInputElement>)=>{
    setCode(e.target.value);
  }

  const onGenerateCode = async ()=>{
    try {
      await axios.post(
        LOGIN_URL,
        JSON.stringify({email}),
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        }
      );
      showCodeEntry(true);
    } catch(ex) {
      console.error(ex);
    }
  }

  const onVerifyCode = async ()=>{
    try {
      const response = await axios.post(
        VERIFY_URL,
        JSON.stringify({email, code}),
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        }
      );
      if (response.status!==200) return;
      const data = await response.data;
      const accessToken = data?.accessToken;
      const user = data?.user;
      setAuth({ user, accessToken });
      navigate(from, { replace: true });
    } catch(ex) {
      console.error(ex);
    }
  }

  return (
    <div className='flexcenter'>
      <Card sx={{minWidth:'45ch'}}>
        <CardMedia
        component="img"
        alt="Login Banner"
        height="140"
        image="https://dummyimage.com/426x240/1975d2/fff.png&text=Login+image"
      />
      <CardContent>
        <Typography gutterBottom variant="h5" component="div">
          Login
        </Typography>
        <br/>
        {codeEntry? (
          <TextField fullWidth
          id="code"
          label="Code"
          type='number'
          value={code}
          onChange={handleCodeChange}
          error={code===''}
          helperText="Please enter the code sent to the email"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <AppRegistrationIcon />
              </InputAdornment>
            ),
          }}
          variant="standard"
        />

        ):<TextField fullWidth
          id="email"
          label="Email"
          type='email'
          value={email}
          onChange={handleEmailChange}
          error={email===''}
          helperText={`Please use your @${process.env['NX_EMAILDOMAINS']} email`}
          InputProps={{
            ref: inputRef,
            startAdornment: (
              <InputAdornment position="start">
                <AccountCircle />
              </InputAdornment>
            ),
          }}
          variant="standard"
        />}
      </CardContent>
      <CardActions >
      {codeEntry? (
        <Button size="small" onClick={onVerifyCode}>Verify</Button>
      ):(
        <Button size="small" onClick={onGenerateCode}>Generate Code</Button>
      )}
      </CardActions>
      </Card>
    </div>
  );
}

export default Login;
