//import regeneratorRuntime from "regenerator-runtime";
//import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useState, ChangeEvent, useEffect } from 'react';
import { Alert, Box, CircularProgress, Divider, FilledInput, FormControl, Grid, Input, InputAdornment, InputBase, InputLabel, ListSubheader, MenuItem, OutlinedInput, Paper, Select, Slider, Stack, TextField, ToggleButton } from '@mui/material';
import TelegramIcon from '@mui/icons-material/Telegram';
import PsychologyAltIcon from '@mui/icons-material/PsychologyAlt';
import IconButton from '@mui/material/IconButton';
import SettingsIcon from '@mui/icons-material/Settings';
import DisplaySettingsIcon from '@mui/icons-material/DisplaySettings';
import { AxiosError } from 'axios';
import useAxiosPrivate from 'psnapi/useAxiosPrivate';
import { useNavigate } from 'react-router-dom';
import { IChatSession } from 'sharedtypes';
import { useChatHistory, useChatSession } from '../api/chat';
import MicIcon from '@mui/icons-material/Mic';

interface ChatTextFieldProps {
  sessionid?: string;
  message?: string;
  messageid?: string;
  onSuccess?: (session: IChatSession) => void;
}

export function ChatTextField(props: ChatTextFieldProps) {
  const {sessionid} = props;
  const axios = useAxiosPrivate();
  const {data:chatsession, error, mutation} = useChatSession(sessionid||'');
  const [newMessage, setNewMessage] = useState<string>('');
  const [isBusy, setIsBusy] = useState(false);
  const [model, setModel] = useState('gpt35turbo-test');
  const [assistant, setAssistant] = useState('You are a helpful AI assistant.');
  const [context, setContext] = useState('none');
  const [showOptions, setShowOptions] = useState(false);
  const [showParameters, setShowParameters] = useState(false);
  const [temperature, setTemperature] = useState(0);
  const [max_tokens, setMaxTokens] = useState(400);
  const [errorMessage, setErrorMessage] = useState<string>();
  // const {
  //   transcript,
  //   listening,
  //   resetTranscript,
  //   browserSupportsSpeechRecognition
  // } = useSpeechRecognition();

  useEffect (()=>{
    setNewMessage(props.message||'');
  },[props.message]);

  useEffect(()=>{
    if (chatsession) {
      if (chatsession.options?.model) {
        setModel(chatsession.options.model as string);
      }
      setAssistant(chatsession.messages[0].content);
    }
  }, [chatsession])

  const handleNewMessageChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
  };

  const onSend = async () => {
    setIsBusy(true);
    setErrorMessage(undefined);
    mutation.mutate({
      model, assistant,
      message: newMessage,
      parameters: {
        temperature,
        max_tokens,
      }
    },{
      onSuccess: (newSession:IChatSession)=>{
        setNewMessage('');
        if (props.onSuccess) {
          props.onSuccess(newSession);
        }
        setIsBusy(false);
      },
      onError: (err)=>{
        const res:any = (err as AxiosError).response?.data;
        setErrorMessage(res?.message || 'Unable to send message. Please try again!');
        setIsBusy(false);
      }
    });
  };

  const handleMessageKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (e.ctrlKey) {
        setNewMessage(prev => prev + '\n');
      }
      else {
        onSend();
      }
    }
  };
  const rowCount = newMessage.split('').filter(c => c === '\n').length + 1;

  return (<Box>
    {error ? <Alert severity="error">{error.response?.data as string}</Alert> : null}
    {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
    <Paper
      component="div"
      sx={theme=>({ p: '2px 4px', display: 'flex', alignItems: 'center', width: '100%', backgroundColor: theme.palette.background.default })}
    >
      <IconButton sx={{ p: '10px' }} aria-label="settings" onClick={()=>setShowOptions(!showOptions)}>
        <SettingsIcon color={showOptions?'primary':'inherit'}/>
      </IconButton>
      {/* {browserSupportsSpeechRecognition ? <IconButton sx={{ p: '10px' }} aria-label="settings"
        onClick={async ()=>{listening?SpeechRecognition.stopListening():SpeechRecognition.startListening()}}>
        <MicIcon color={listening?'success':'inherit'}/>
      </IconButton> : null} */}
      <InputBase multiline rows={rowCount}
        sx={{ ml: 1, flex: 1 }}
        placeholder="Type your message here..."
        inputProps={{ 'aria-label': 'chat message box' }}
        value={newMessage}
        onChange={handleNewMessageChange}
        onKeyUp={handleMessageKeyUp}
        disabled={isBusy}
      />
      {isBusy?<CircularProgress/>:(
      <IconButton sx={{ p: '10px' }} color={newMessage !== '' ? 'primary' : 'inherit'} disabled={newMessage === ''}
        aria-label="send message" onClick={onSend}>
        <PsychologyAltIcon />
      </IconButton>)}
      <Divider sx={{ height: 28, m: 0.5 }} orientation="vertical" />
      <IconButton sx={{ p: '10px' }} aria-label="directions" onClick={()=>setShowParameters(!showParameters)}>
        <DisplaySettingsIcon color={showParameters?'primary':'inherit'} />
      </IconButton>
    </Paper>
    {showOptions && <Grid container sx={{ml:-1, mt:0.5}}>
      <Grid item xs={12} sm={3} sx={{pr:1}}>
        <FormControl sx={{ m: 1}} fullWidth disabled={sessionid!==undefined}>
          <InputLabel htmlFor="model-select">Model</InputLabel>
          <Select id="model-select" label="Model" size='small'
            value={model}
            onChange={(e)=>setModel(e.target.value as string)}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            <ListSubheader>Standard</ListSubheader>
            <MenuItem value={'gpt35turbo-test'}>GPT 3.5 Turbo</MenuItem>
            <MenuItem value={'gpt4'} disabled>GPT 4</MenuItem>
            <ListSubheader>Custom</ListSubheader>
            <MenuItem value={'psbodhi'}>PS Bodhi</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6} sx={{pr:1}}>
        <FormControl sx={{ m: 1}} fullWidth disabled={sessionid!==undefined}>
          <InputLabel htmlFor="assistant-select">Act as</InputLabel>
          <Select id="assistant-select" label="Act as" size='small'
            value={assistant}
            onChange={(e)=>setAssistant(e.target.value as string)}
          >
            <MenuItem value={'You are a helpful AI assistant.'}>AI Assistant</MenuItem>
            <Divider/>
            <MenuItem value={'You are a helpful AI assistant, acting as a senior software engineer.'}>Senior Software Engineer</MenuItem>
            <MenuItem value={'You are a helpful AI assistant, acting as a senior product manager.'}>Senior Product Manager</MenuItem>
            <MenuItem value={'You are a helpful AI assistant, acting as a senior experience or UX designer.'}>Senior Experience designer</MenuItem>
            <Divider/>
            <MenuItem value={'You are a helpful AI assistant, acting as a senior software engineer. when reviewing the code you look for exception handling, security issues, performance problems, and readability of code.'}>AI Reviewer</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={3}>
        <FormControl sx={{ m: 1}} fullWidth disabled={sessionid!==undefined}>
          <InputLabel htmlFor="assistant-select">Additional Context</InputLabel>
          <Select id="assistant-select" label="Additional Context" size='small'
            value={context}
            onChange={(e)=>setContext(e.target.value as string)}
          >
            <MenuItem value={'none'}>none</MenuItem>
          </Select>
        </FormControl>
      </Grid>
    </Grid>}
    {showParameters && <Grid container sx={{mt:0.5}}>
      <Grid item xs={12} sm={6} sx={{p:0.5}}>
        <TextField id="model-temperature" label="Temperature" size='small'
          type='number' fullWidth
          value={temperature}
          onChange={(e)=>setTemperature(parseInt(e.target.value))}
        />
      </Grid>
      <Grid item xs={12} sm={6} sx={{p:0.5}}>
        <TextField id="max_tokens" label="Max Tokens" size='small'
          type='number' fullWidth
          value={max_tokens}
          onChange={(e)=>setMaxTokens(parseInt(e.target.value))}
        />
      </Grid>
    </Grid>}
  </Box>
  );
}
