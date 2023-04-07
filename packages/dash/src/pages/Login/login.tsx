import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Card, CardActions, CardContent, CardMedia, CircularProgress, Dialog, InputAdornment, TextField, Typography } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import AccountCircle from '@mui/icons-material/AccountCircle';
import AppRegistrationIcon from '@mui/icons-material/AppRegistration';
import useAuth from 'sharedui/hooks/useAuth';
import axios from 'psnapi/axios';
import GenericDialog from '@/components/GenericDialog';

const LOGIN_URL = '/auth/requestaccess';
const VERIFY_URL = '/auth/gettoken';

/* eslint-disable-next-line */
export interface LoginProps {}

export function Login(props: LoginProps) {

  const { setAuth } = useAuth();
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
  }, [])

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>)=>{
    setEmail(e.target.value);
  }

  const handleCodeChange = (e: ChangeEvent<HTMLInputElement>)=>{
    setCode(e.target.value);
  }

  const onGenerateCode = async ()=>{
    try {
      setBusy(true);
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
    <div className='flexcenter'>
      <Card sx={{minWidth:'45ch'}}>
        {/* <Typography gutterBottom variant="h5" component="div" sx={{p:1}}>
          Login
        </Typography> */}
        <CardMedia
        component="img"
        alt="Login Banner"
        height="140"
        image="/assets/login.png"
      />
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
                <AccountCircle />
              </InputAdornment>
            ),
          }}
          variant="standard"
        />}
        {error !== '' ? <Alert severity="error">{error}</Alert> : null}
      </CardContent>
      <CardActions >
        <Box sx={{position: 'relative' }}>
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
      </CardActions>
      </Card>
      <GenericDialog title='PSNext.info' open={true}>
        <div>
          <p>
            This dashboard is designed to help you objectively measure your progress against key metrics and expectations from your role at Publicis Sapient.
          </p>
          <p>Some key points:</p>
          <ol>
            <li><em>Confidentiality:</em> To protect the privacy of individuals, data will be aggregated or presented in a manner that does not allow for the identification of individual employees.</li>
            <li><em>Data Access:</em> As an individual, you will have access to only your information related to key expectations from your role. If you are a people manager, you will be able to view aggregated data of the individuals that report to your hierarch.  </li>
            <li><em>Data Limitations:</em> The data presented in this dashboard is based on the information available at a point in time and may not reflect the most current or accurate information.</li>
            <li><em>Accuracy:</em> Every effort has been made to ensure the accuracy of the data presented in this dashboard and it will represent only data that is available across the Publicis Sapient system records. </li>
            <li><em>Use of Data:</em> The data presented in this dashboard is intended for informational & progress improvement purposes only.</li>
          </ol>

          <p>Last update: 10th February 2023</p>
        </div>
      </GenericDialog>
    </div>
  );
}

export default Login;
