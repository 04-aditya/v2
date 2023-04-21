import { useState, ChangeEvent, useEffect, useCallback } from 'react';
import { Alert, Box, Checkbox, CircularProgress, Divider, FilledInput, FormControl, Grid, Input, InputAdornment, InputBase, InputLabel, ListItemText, ListSubheader, MenuItem, OutlinedInput, Paper, Select, SelectChangeEvent, Slider, Stack, TextField, ToggleButton } from '@mui/material';
import TelegramIcon from '@mui/icons-material/Telegram';
import PsychologyAltIcon from '@mui/icons-material/PsychologyAlt';
import IconButton from '@mui/material/IconButton';
import SettingsIcon from '@mui/icons-material/Settings';
import DisplaySettingsIcon from '@mui/icons-material/DisplaySettings';
import { AxiosError } from 'axios';
import { IChatSession } from 'sharedtypes';
import { useChatHistory, useChatModels, useChatSession } from '../api/chat';
import MicIcon from '@mui/icons-material/Mic';
import { Steps, Hints } from "intro.js-react";
// import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'
import useSpeechToText from 'react-hook-speech-to-text';


const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};
interface ChatTextFieldProps {
  sessionid?: string;
  message?: string;
  messageid?: string;
  onSuccess?: (session: IChatSession) => void;
}

const systemMessages = [
  {name:'AI Assistant', message: 'You are a helpful AI assistant. Respond in markdown format when possible'},
  {name:'divider', message: ''},
  {name:'Senior Software Engineer', message: 'You are a helpful AI assistant, acting as a senior software engineer.Respond in markdown format when possible'},
  {name:'Senior Product Manager', message: 'You are a helpful AI assistant, acting as a senior product manager.Respond in markdown format when possible'},
  {name:'Senior Experience designer', message: 'You are a helpful AI assistant, acting as a senior experience or UX designer.Respond in markdown format when possible'},
  {name:'divider', message: ''},
  {name:'AI Reviewer', message: 'You are a helpful AI assistant, acting as a senior software engineer. when reviewing the code you look for exception handling, security issues, performance problems, and readability of code. Respond in markdown format when possible'},
  {name:'AI Architect', message:'I want you to act as an IT Architect. I will provide some details about the functionality of an application or other digital product, and it will be your job to come up with ways to integrate it into the IT landscape. This could involve analyzing business requirements, performing a gap analysis and mapping the functionality of the new system to the existing IT landscape. Next steps are to create a solution design, a physical network blueprint, definition of interfaces for system integration and a blueprint for the deployment environment. '},
];

export function ChatTextField(props: ChatTextFieldProps) {
  // const {
  //   transcript,
  //   listening,
  //   resetTranscript,
  //   browserSupportsSpeechRecognition
  // } = useSpeechRecognition();
  const {
    error: speechError,
    interimResult,
    isRecording,
    results,
    setResults,
    startSpeechToText,
    stopSpeechToText,
  } = useSpeechToText({
    continuous: true,
    useLegacyResults: false,
    speechRecognitionProperties: {
      lang: 'en-US',
      interimResults: true // Allows for displaying real-time speech results
    }
  });
  const {sessionid} = props;
  const chatModels = useChatModels();
  const {data:chatsession, error, mutation} = useChatSession(sessionid||'');
  const [newMessage, setNewMessage] = useState<string>('');
  const [isBusy, setIsBusy] = useState(false);
  const [model, setModel] = useState('gpt35turbo-test');
  const [assistant, setAssistant] = useState(systemMessages[0].message);
  const [contexts, setContext] = useState<string[]>([]);
  const [showOptions, setShowOptions] = useState(false);
  const [showParameters, setShowParameters] = useState(false);
  const [temperature, setTemperature] = useState(0);
  const [max_tokens, setMaxTokens] = useState(400);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [introState, setIntroState] = useState({
    stepsEnabled: false,
    initialStep: 0,
    steps: [
      {
        element: '.chat-message-field',
        title:'Message',
        intro: "Continue the converstaion by entering your next message here... ",
        position: 'top',
      },
    ],
    hintsEnabled: false,
    hints: [
      {
        element: ".hello",
        hint: "Hello hint",
        hintPosition: "middle-right"
      }
    ]
  });

  useEffect (()=>{
    setNewMessage(props.message||'');
  },[props.message]);

  useEffect(()=>{
    if (chatsession) {
      //setIntroState(prev=>({...prev, stepsEnabled: true}));
      if (chatsession.options?.model) {
        setModel(chatsession.options.model as string);
      }
      if (chatsession.options?.context) {
        setContext(chatsession.options.context as string[]);
      }
      setAssistant(chatsession.messages[0].content);
    }
  }, [chatsession])

  useEffect(()=>{
    if (!isRecording) {
      setNewMessage(msg=>{
        const newMsg = msg + results.map((r:any)=>r.transcript+' ').join('\n');
        setResults([]);
        return newMsg;
      });
    }
  },[results, setResults, isRecording])
  const handleNewMessageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const msg = e.target.value;
    if (msg.length<2000) {
      setErrorMessage(undefined);
      setNewMessage(msg);
    } else {
      setErrorMessage('Message is too long. Please shorten it to less than 2000 characters.');
    }
  };

  const onSend = async () => {
    setIsBusy(true);
    setErrorMessage(undefined);
    mutation.mutate({
      id:sessionid,
      model, assistant, contexts,
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
  const handleContextChange = (event: SelectChangeEvent<string[]>) => {
    const {
      target: { value },
    } = event;
    setContext(
      // On autofill we get a stringified value.
      typeof value === 'string' ? value.split(',') : value,
    );
  }
  const handleStopSpeaking = useCallback(()=>{
    if (isRecording){
      stopSpeechToText();
    }
  },[isRecording, stopSpeechToText,]);
  const onExit = () => {
    setIntroState((prev) => ({...prev, stepsEnabled: false }));
  };
  const rowCount = newMessage.split('').filter(c => c === '\n').length + 1;
  const availableModels = chatModels.data || [];
  const availableContexts = availableModels.find(m=>m.id===model)?.contexts||[];
  return (<Box>
    <Steps
      enabled={introState.stepsEnabled}
      steps={introState.steps}
      initialStep={introState.initialStep}
      onExit={onExit}/>
    <Hints enabled={introState.hintsEnabled} hints={introState.hints} />
    {error ? <Alert severity="error">{error.response?.data as string}</Alert> : null}
    {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
    <Paper
      component="div"
      sx={theme=>({ p: '2px 4px', display: 'flex', alignItems: 'center', width: '100%', backgroundColor: theme.palette.background.default })}
    >
      <IconButton sx={{ p: '10px' }} aria-label="settings" onClick={()=>setShowOptions(!showOptions)}>
        <SettingsIcon color={showOptions?'primary':'inherit'}/>
      </IconButton>
      {!speechError ? <IconButton sx={{ p: '10px' }} aria-label="settings"
        onMouseDown={()=>{startSpeechToText();}}
        onMouseUp={handleStopSpeaking}>
        <MicIcon color={isRecording?'secondary':'inherit'}/>
      </IconButton> : null}
      {/* {browserSupportsSpeechRecognition ? <IconButton sx={{ p: '10px' }} aria-label="settings"
        onClick={async ()=>{listening?SpeechRecognition.stopListening():SpeechRecognition.startListening()}}>
        <MicIcon color={listening?'success':'inherit'}/>
      </IconButton> : null} */}
      <InputBase multiline rows={rowCount} className='chat-message-field'
        sx={{ ml: 1, flex: 1 }} autoFocus
        placeholder="Type your message here..."
        inputProps={{ 'aria-label': 'chat message box' }}
        value={newMessage + (interimResult||'')}
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
            <ListSubheader>Standard</ListSubheader>
            {(chatModels?.data||[]).filter(m=>m.group==='Standard').map(m=><MenuItem key={m.id} value={m.id} disabled={!m.enabled}>{m.name}</MenuItem>)}
            <ListSubheader>Custom</ListSubheader>
            {(chatModels?.data||[]).filter(m=>m.group==='Custom').map(m=><MenuItem key={m.id} value={m.id} disabled={!m.enabled}>{m.name}</MenuItem>)}
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
            {systemMessages.map((m,i)=>(m.name==='divider')?<Divider key={i}/>:<MenuItem key={i} value={m.message}>{m.name}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={3}>
        <FormControl sx={{ m: 1}} fullWidth disabled={sessionid!==undefined || availableContexts.length===0}>
          <InputLabel htmlFor="contexts-select-label">Additional Context</InputLabel>
          <Select<string[]> id="contexts-select" labelId="contexts-select-label" label="Additional Contexts" size='small'
            multiple
            input={<OutlinedInput label="Tag" />}
            value={contexts}
            renderValue={(selected) => selected.join(', ')}
            onChange={handleContextChange}
            MenuProps={MenuProps}
          >
            {
              availableContexts.map(c=> <MenuItem key={c.id} value={c.id}>
                <Checkbox checked={contexts.indexOf(c.id) > -1} />
                <ListItemText primary={c.name} />
              </MenuItem>)
            }
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
