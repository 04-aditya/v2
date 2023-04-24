import { useState, ChangeEvent, useEffect, useCallback } from 'react';
import { Alert, Box, CircularProgress, Divider, Fade, InputBase, Paper, Typography } from '@mui/material';
import TelegramIcon from '@mui/icons-material/Telegram';
// import PsychologyAltIcon from '@mui/icons-material/PsychologyAlt';
// import SettingsIcon from '@mui/icons-material/Settings';
import PsychologyIcon from '@mui/icons-material/Psychology';
import IconButton from '@mui/material/IconButton';
import DisplaySettingsIcon from '@mui/icons-material/DisplaySettings';
import { IChatSession } from 'sharedtypes';
import {useChatModels, useChatSession } from '../api/chat';
import MicIcon from '@mui/icons-material/Mic';
import { Steps, Hints } from "intro.js-react";
import useSpeechToText from 'react-hook-speech-to-text';
import { DefaultModelOptions, IModelOptions, ModelOptions } from './ModelOptions';
import { IModelParameters, ModelParameters } from './ModelParameters';
interface ChatTextFieldProps {
  sessionid?: string;
  message?: string;
  messageid?: string;
  onSuccess?: (session: IChatSession) => void;
}

export function ChatTextField(props: ChatTextFieldProps) {
  const {data:models} = useChatModels(); // preload
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
  const {data:chatsession, error, mutation} = useChatSession(sessionid);
  const [newMessage, setNewMessage] = useState<string>('');
  const [isBusy, setIsBusy] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState(DefaultModelOptions);
  const [showParameters, setShowParameters] = useState(false);
  const [parameters, setParameters] = useState<IModelParameters>({temperature:0, max_tokens: 400});
  const [errorMessage, setErrorMessage] = useState<string>();
  const [msgTokens, setMsgTokens] = useState(0);
  const [introState, setIntroState] = useState({
    stepsEnabled: false, // sessionid?false:true,
    initialStep: 0,
    steps: [
      {
        element: '.chat-message-field',
        title:'Message',
        intro: "Start the converstaion by entering your next message here... ",
        position: 'bottom',
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
      if (chatsession.options) {
        setOptions({
          model: chatsession.options.model as string,
          contexts: chatsession.options.contexts as string[],
          assistant: chatsession.messages[0].content,
        });
      }
    }
  }, [chatsession])

  useEffect(()=>{
    if (!isRecording) {
      setNewMessage(msg=>{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newMsg = msg + results.map((r: any)=>r.transcript+' ').join('\n');
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
      //https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them
      setMsgTokens(Math.round(msg.length/4));
    } else {
      setErrorMessage('Message is too long. Please shorten it to less than 2000 characters.');
    }
  };

  const handleOptionsChange = (options: IModelOptions)=>setOptions(options);

  const handleParametersChange = (params: IModelParameters)=>setParameters(params);

  const onSend = async () => {
    setIsBusy(true);
    setErrorMessage(undefined);
    mutation.mutate({
      id:sessionid,
      model: options.model, assistant: options.assistant, contexts: options.contexts,
      message: newMessage,
      parameters,
    },{
      onSuccess: (newSession:IChatSession)=>{
        setNewMessage('');
        if (props.onSuccess) {
          props.onSuccess(newSession);
        }
        setIsBusy(false);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any)=>{
        const res = err.response?.data?.message;
        setErrorMessage(res || 'Unable to send message. Please try again!');
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
  const handleStopSpeaking = useCallback(()=>{
    if (isRecording){
      stopSpeechToText();
    }
  },[isRecording, stopSpeechToText,]);
  const onExit = () => {
    setIntroState((prev) => ({...prev, stepsEnabled: false }));
  };
  const rowCount = newMessage.split('').filter(c => c === '\n').length + 1;
  return (<Box>
    <Steps
      enabled={introState.stepsEnabled}
      steps={introState.steps}
      initialStep={introState.initialStep}
      onExit={onExit}/>
    <Hints enabled={introState.hintsEnabled} hints={introState.hints} />
    {error ? <Alert severity="error">{error.response?.data as string}</Alert> : null}
    {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

    <Paper className='chat-message-field'
      component="div"
      sx={theme=>({ p: '2px 4px', display: 'flex', alignItems: 'center', width: '100%', backgroundColor: theme.palette.background.default, position:'relative' })}
    >
      <IconButton sx={{ p: '10px' }} aria-label="settings" onClick={()=>setShowOptions(!showOptions)}>
        <PsychologyIcon color={showOptions?'secondary':'inherit'} sx={{transform:'scale(-1,1)'}}/>
      </IconButton>
      <InputBase multiline rows={rowCount}
        sx={{ ml: 1, flex: 1 }} autoFocus
        placeholder="Type your message here..."
        inputProps={{ 'aria-label': 'chat message box' }}
        value={newMessage + (interimResult||'')}
        onClick={()=>{
          // const context = new AudioContext();
          // console.log(context);
        }}
        onChange={handleNewMessageChange}
        onKeyUp={handleMessageKeyUp}
        disabled={isBusy}
      />
      {!speechError ? <IconButton sx={{ p: '10px' }} aria-label="settings" disabled={isBusy}
        onMouseDown={()=>{startSpeechToText();}}
        onMouseUp={handleStopSpeaking}>
        <MicIcon color={isRecording?'secondary':'inherit'}/>
      </IconButton> : null}
      {isBusy?<CircularProgress/>:(
      <IconButton sx={{ p: '10px' }} color={newMessage !== '' ? 'primary' : 'inherit'} disabled={newMessage === ''}
        aria-label="send message" onClick={onSend}>
        <TelegramIcon/>
      </IconButton>)}
      <Divider sx={{ height: 28, m: 0.5 }} orientation="vertical" />
      <IconButton sx={{ p: '10px' }} aria-label="directions" onClick={()=>setShowParameters(!showParameters)}>
        <DisplaySettingsIcon color={showParameters?'primary':'inherit'} />
      </IconButton>
      <Box sx={{position:'absolute', right:96, bottom:0}}>
        <Typography variant='caption' color='secondary'><small>{msgTokens}/4000</small></Typography>
      </Box>
    </Paper>
    {showOptions && <ModelOptions options={options} onChange={handleOptionsChange}/>}
    {showParameters && <ModelParameters parameters={parameters} onChange={handleParametersChange}/>}
  </Box>
  );
}


