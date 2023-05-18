import React, { useState, ChangeEvent, useEffect, useCallback } from 'react';
import { Alert, Box, Button, CircularProgress, Divider, Fade, InputBase, Paper, Stack, Tooltip, Typography } from '@mui/material';
import TelegramIcon from '@mui/icons-material/Telegram';
// import PsychologyAltIcon from '@mui/icons-material/PsychologyAlt';
// import SettingsIcon from '@mui/icons-material/Settings';
import PsychologyIcon from '@mui/icons-material/Psychology';
import IconButton from '@mui/material/IconButton';
import DisplaySettingsIcon from '@mui/icons-material/DisplaySettings';
import { APIResponse, IChatMessage, IChatSession } from 'sharedtypes';
import {useChatModels, useChatSession } from '../api/chat';
import MicIcon from '@mui/icons-material/Mic';
import { Steps, Hints } from "intro.js-react";
import useSpeechToText from 'react-hook-speech-to-text';
import { DefaultModelOptions, IModelOptions, ModelOptions } from './ModelOptions';
import { IModelParameters, ModelParameters } from './ModelParameters';
import SyncIcon from '@mui/icons-material/Sync';
import {notificationDispatch, useNotificationStore} from 'sharedui/hooks/useNotificationState';
import useAxiosPrivate from 'psnapi/useAxiosPrivate';
import ChatCmdList from './CmdList';

interface ChatTextFieldProps {
  session?:IChatSession;
  message?: IChatMessage;
  onSuccess?: (session: IChatSession) => void;
  showRegenerate?: boolean;
}

export function ChatTextField(props: ChatTextFieldProps) {
  const axios = useAxiosPrivate();
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
  const {mutation, error} = useChatSession(props.session?.id);
  const [chatsession, setChatSession] = useState<IChatSession>();
  const [newMessage, setNewMessage] = useState<string>('');
  const [isBusy, setIsBusy] = useState(false);
  const [showOptions, setShowOptions] = useState(true);
  const [options, setOptions] = useState(DefaultModelOptions);
  const [showParameters, setShowParameters] = useState(false);
  const [parameters, setParameters] = useState<IModelParameters>({temperature:0, max_tokens: 400});
  const [errorMessage, setErrorMessage] = useState<string>();
  const [msgTokens, setMsgTokens] = useState(0);
  const [introState, setIntroState] = useState({
    stepsEnabled: false, // props.session?.id?false:true,
    initialStep: 0,
    steps: [
      {
        element: '.chat-message-container',
        title:'New Chat',
        intro: "Start the converstaion by entering your next message here... ",

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
    if (!props.message) {
      setNewMessage('');
      return;
    }
    setNewMessage(props.message.content);
  },[props.message]);

  useEffect(()=>{
    if (props.session) {
      setChatSession({...props.session});
      if (props.session.options) {
        setOptions({
          model: props.session.options.model as string,
          contexts: props.session.options.contexts as string[],
          assistant: props.session.messages[0].content,
        });
      }
    }
  },[props.session]);

  // useEffect(()=>{
  //   console.log('useEffect: '+__filename);
  //   if (!isRecording) {
  //     setNewMessage(msg=>{
  //       // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //       const newMsg = msg + results.map((r: any)=>r.transcript+' ').join('\n');
  //       setResults([]);
  //       return newMsg;
  //     });
  //   }
  // },[results, setResults, isRecording])

  const handleNewMessageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const msg = e.target.value;
    if (msg.length<10000) {
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

  const onSend = async (data?: any) => {
    setIsBusy(true);
    setErrorMessage(undefined);
    mutation.mutate(data || {
      id:chatsession?.id,
      model: options.model, assistant: options.assistant, contexts: options.contexts,
      message: newMessage.trimEnd(),
      parameters,
    },{
      onSuccess: (response: APIResponse<IChatSession>)=>{
        if (!response.qid) {
          setErrorMessage('Unable to send message. Please try again!');
          setIsBusy(false);
          return;
        }

        const poller = setInterval(()=>{
          axios.get(`/api/q/${response.qid}`)
            .then(res=>{
              const qresponse = res.data;
              if (qresponse.status==='done') {
                const updatedSession = qresponse.results.data;
                if (updatedSession) {
                  setNewMessage('');
                  setChatSession({...updatedSession});
                  if (props.onSuccess) {
                    props.onSuccess(updatedSession);
                  }
                  setIsBusy(false);
                }
                clearInterval(poller);
              }
              else {
                console.log('polling...'+response.qid);
              }
            })
            .catch(ex=>{
              setErrorMessage('Unable to get the updates to the message. Please try again!');
              setIsBusy(false);
              clearInterval(poller);
            })
        },1000);
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
      if (e.shiftKey || e.altKey) {
        // setNewMessage(prev => prev + '\n');
      }
      else {
        props.message?handleRegenerate():onSend();
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

  const handleRegenerate = async () => {
    if (!chatsession) return;
    const lastUserMsg = props.message ? {...props.message,content:newMessage} : chatsession.messages.slice(-2)[0];

    if (!lastUserMsg) return;
    setIsBusy(true);
    setErrorMessage(undefined);
    onSend({
      id:chatsession?.id,
      model: options.model, assistant: options.assistant, contexts: options.contexts,
      messageid: lastUserMsg.id,
      message: lastUserMsg.content,
      parameters,
    });
  }

  const rowCount = newMessage.split('').filter(c => c === '\n').length + 1;
  return (<Box className='chat-message-container'>
    <Steps
      enabled={introState.stepsEnabled}
      steps={introState.steps}
      initialStep={introState.initialStep}
      onExit={onExit}/>
    <Hints enabled={introState.hintsEnabled} hints={introState.hints} />

    {(props.showRegenerate && !props.message) && <Box sx={{display:'flex',p:1, flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
      <Button variant='outlined' endIcon={<SyncIcon/>} onClick={handleRegenerate}>Regenerate</Button>
    </Box>}
    {error ? <Alert severity="error">{error.response?.data as string}</Alert> : null}
    {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
    <div id="finalMessage" aria-live="polite" role="status" className="sr-only" aria-hidden="false"></div>
    <Paper className='chat-message-field'
      component="div"
      sx={theme=>({ p: '2px 4px', width: '100%', backgroundColor: theme.palette.background.default, position:'relative' })}
    >
      <Stack direction={'row'} spacing={0.5} alignItems={'center'}>
        {showOptions?null:<Typography variant='caption'><em>use model:</em></Typography>}
        {showOptions?null:<Typography variant='caption' color={'primary'}><strong>{options.model}</strong>&nbsp;</Typography>}
        {/* <ChatCmdList commands={[
          {label:'model', name:options.model, icon:<PsychologyIcon fontSize='small' color={showOptions?'secondary':'inherit'} sx={{transform:'scale(-1,1)'}}/>}
          ]}
          onClick={(e,c)=>{console.log(c)}}/> */}
      </Stack>
      <Box sx={{display: 'flex', alignItems: 'center', width: '100%',}}>
        <IconButton sx={{ p: '10px' }} aria-label="settings" onClick={()=>setShowOptions(!showOptions)}>
          <PsychologyIcon color={showOptions?'secondary':'inherit'} sx={{transform:'scale(-1,1)'}}/>
        </IconButton>
        <InputBase multiline rows={rowCount}
          sx={{ ml: 1, flex: 1 }} autoFocus
          placeholder="Type your message here (use shift/alt+enter for a new line)..."
          inputProps={{
            'aria-label': 'chat message box' ,
            speech: 'speech',
            'x-webkit-speech': 'x-webkit-speech',
            'x-webkit-grammar': 'builtin:translate',
            lang: 'en'
          }}
          value={newMessage + (interimResult||'')}
          onClick={()=>{
            // const context = new AudioContext();
            // console.log(context);
          }}
          onChange={handleNewMessageChange}
          onKeyUp={handleMessageKeyUp}
          disabled={isBusy}
        />
        {/* {!speechError ? <IconButton sx={{ p: '10px' }} aria-label="settings" disabled={isBusy}
          onMouseDown={()=>{startSpeechToText();}}
          onMouseUp={handleStopSpeaking}>
          <MicIcon color={isRecording?'secondary':'inherit'}/>
        </IconButton> : null} */}
        {isBusy?<CircularProgress/>:(
        <IconButton sx={{ p: '10px' }} color={newMessage !== '' ? 'primary' : 'inherit'} disabled={newMessage === ''}
          aria-label="send message" onClick={props.message? handleRegenerate : onSend}>
          <TelegramIcon/>
        </IconButton>)}
        <Divider sx={{ height: 28, m: 0.5 }} orientation="vertical" />
        <IconButton sx={{ p: '10px' }} aria-label="directions" onClick={()=>setShowParameters(!showParameters)}>
          <DisplaySettingsIcon color={showParameters?'primary':'inherit'} />
        </IconButton>
      </Box>
      <Box sx={{position:'absolute', right:96, bottom:0}}>
        <Tooltip arrow title={<React.Fragment>
            <Typography color="inherit" variant="caption">Tokens can be thought of as pieces of words. Before the API processes the prompts, the input is broken down into tokens.</Typography>
            <a style={{color:"inherit"}}
              href='https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them'>read more about token here...</a>
          </React.Fragment>}>
          <Typography variant='caption' color='secondary'><small>{msgTokens}/4000</small></Typography>
        </Tooltip>
      </Box>
    </Paper>
    {showOptions && <ModelOptions options={options} onChange={handleOptionsChange}/>}
    {showParameters && <ModelParameters parameters={parameters} onChange={handleParametersChange}/>}
  </Box>
  );
}


