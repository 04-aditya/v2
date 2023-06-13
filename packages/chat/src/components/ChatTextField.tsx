import React, { useState, ChangeEvent, useEffect, useCallback, useMemo, useRef } from 'react';
import { Alert, Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Fade, InputBase, ListItem, ListItemButton, ListItemText, MenuItem, Paper, Popover, Snackbar, Stack, Tooltip, Typography } from '@mui/material';
import TelegramIcon from '@mui/icons-material/Telegram';
// import PsychologyAltIcon from '@mui/icons-material/PsychologyAlt';
// import SettingsIcon from '@mui/icons-material/Settings';
import PsychologyIcon from '@mui/icons-material/Psychology';
import IconButton from '@mui/material/IconButton';
import DisplaySettingsIcon from '@mui/icons-material/DisplaySettings';
import { APIResponse, IChatCommand, IChatMessage, IChatSession } from 'sharedtypes';
import {useChatCommands, useChatModels, useChatSession } from '../api/chat';
import MicIcon from '@mui/icons-material/Mic';
import { Steps, Hints } from "intro.js-react";
import useSpeechToText from 'react-hook-speech-to-text';
import { DefaultModelOptions, IModelOptions, ModelOptions } from './ModelOptions';
import { IModelParameters, ModelParameters } from './ModelParameters';
import SyncIcon from '@mui/icons-material/Sync';
import {notificationDispatch, useNotificationStore} from 'sharedui/hooks/useNotificationState';
import useAxiosPrivate from 'psnapi/useAxiosPrivate';
import ChatCmdList from './CmdList';
import { useDropzone } from 'react-dropzone';
import DescriptionIcon from '@mui/icons-material/Description';
import FolderIcon from '@mui/icons-material/Folder';
import TPopover from 'sharedui/components/TPopover';
import { fi } from 'date-fns/locale';
interface ChatTextFieldProps {
  session?:IChatSession;
  message?: IChatMessage;
  onSuccess?: (session: IChatSession) => void;
  showRegenerate?: boolean;
}

const cmdRegEx = /^\s*(\/(\w+):([\w|.|\/|:|,])*\s)*/g;
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
  const {data:commands} = useChatCommands();
  const [msgEl, setMsgEl] = React.useState<HTMLInputElement | null>(null);
  const [openCmdPanel, setOpenCmdPanel] = useState(false);
  const {mutation, error} = useChatSession(props.session?.id);
  const [chatsession, setChatSession] = useState<IChatSession>();
  const [newMessage, setNewMessage] = useState<string>('');
  const [isBusy, setIsBusy] = useState(false);
  const [showOptions, setShowOptions] = useState(true);
  const [options, setOptions] = useState(DefaultModelOptions);
  const [showParameters, setShowParameters] = useState(false);
  const [parameters, setParameters] = useState<IModelParameters>({temperature:0, max_tokens: 1000});
  const [errorMessage, setErrorMessage] = useState<string>();
  const [msgTokens, setMsgTokens] = useState(0);const [snackbarMessage, setSnackbarMessage] = useState('');
  const iref = useRef<HTMLInputElement>();
  const [files, setFiles] = useState<Record<string,any>>({});
  const [processingInput, setProcessingInput] = useState(false);

  const onDrop = useCallback((acceptedFiles:Array<any>) => {
    acceptedFiles.map((file:any, index:number) => {
      console.log(file);
      setFiles(files=>({...files, [file.name]: {file, status: 'initial', progress: 0}}));
      showSnackbar(`adding file ${file.name} to the chat...`);
      // const reader = new FileReader();
      // reader.onload = function (e) {
      //   console.log(e);
      // }
      // reader.readAsBinaryString(file);
      // showSnackbar(`reading file ${file.name}`);
    });
  },[]);
  const {
    getRootProps,
    getInputProps,
    acceptedFiles,
    open,
    isDragActive,
    isDragAccept,
    isFocused,
    isDragReject,
  } = useDropzone({
    //accept: '*/*',
    onDrop,
    // Disable click and keydown behavior
    noClick: true,
    noKeyboard: true,
  });

  const handleSnackbarClose = (event: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarMessage('')
  };

  const showSnackbar = (msg: string)=>{
    setSnackbarMessage(msg);
  }
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
    const msg = (e.target.value as string).trimStart();
    if (msg.startsWith('/') && msg[msg.length-1]===' ') {
      const word = msg.split(' ');
      const parts = word[0].split(':');
      switch(parts[0]) {
        case '/model': {
          const selectedmodel = models?.find(m=>m.id===(parts[1]||'').toLowerCase())
          if (!selectedmodel) {
            setErrorMessage(`Invalid model ${parts[1]}`);
            break;
          }
          setOptions({...options, model:selectedmodel.id});
          setNewMessage('');
          setErrorMessage(undefined);
          showSnackbar(`set model to ${selectedmodel.name}`);
          e.stopPropagation();
          e.preventDefault();
          return;
        }
        case '/temperature': {
          const temp:number = parseFloat(parts[1]);
          if (isNaN(temp) || (temp<0 || temp>2)) {
            setErrorMessage('Invalid temperature value. Please enter a number between 0 and 2.');
            break;
          }
          setParameters({...parameters, temperature:temp});
          setNewMessage('');
          setErrorMessage(undefined);
          showSnackbar(`set temperature to ${temp}`);
          e.stopPropagation();
          e.preventDefault();
          return;
        }
        case '/web': {
          const params = parts[1].split(',')
          let count:number = parseFloat(params[0]);
          let site:string|undefined = params[1];
          if (isNaN(count)) {
            site=params[0];
            count=5;
          }
          if ((count<0 || count>10)) {
            setErrorMessage('Invalid count value. Please enter a number between 0 and 10.');
            break;
          }
          setOptions({...options, ...{ web: { count, site } }});
          setNewMessage('');
          setErrorMessage(undefined);
          showSnackbar(`set web count to ${count}`);
          e.stopPropagation();
          e.preventDefault();
          return;
        }
      }
      return setNewMessage(msg);
    }

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

  const processInput = useCallback(async ()=>{
    console.log('started input processing');
    const fileToUpload=Object.keys(files);
    if (fileToUpload.length) {
      setProcessingInput(true);
      for (const fname of fileToUpload) {
        const file = files[fname];
        console.log(file.file);
        if (file.status==='initial') {
          setFiles(files=>({...files, [fname]: {file: file.file, status: 'processing'}}));
          const formData = new FormData();
          formData.append("file", file.file);
          const ar = axios.post(`/api/chat/upload`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          })
          // const reader = new FileReader();
          // reader.onload = function (e) {
          //   console.log(e);
          //   const formData = new FormData();
          //   formData.append("file", e.target?.result as unknown as Blob);
          //   axios.post(`/api/chat/upload`, formData, {
          //     headers: {
          //       'Content-Type': 'multipart/form-data'
          //     }
          //   }).then(ar=>{
          //     setFiles(files=>({...files, [fname]: {file:file, status: 'done'}}));
          //   }).catch(console.error)
          // }
          // reader.readAsArrayBuffer(file.file);
        }
      }
      //throw new Error('Files not yet supported. Comming soon')
    }
  },[axios, files]);



  const onSend = async (data?: any) => {
    setIsBusy(true);
    setErrorMessage(undefined);

    processInput()
      .then (()=>{
        mutation.mutate(data || {
          id:chatsession?.id,
          options: {
            model: options.model,
            web: options.web,
            assistant: options.assistant,
            contexts: options.contexts,
            parameters,
          },
          message: newMessage.trimEnd(),
          async: true,
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
      })
      .catch(err=>{
        console.error(err);
        setErrorMessage('Unable to process inputs for the message. Please try again!');
        setIsBusy(false);
      });
  };

  const handleCmdPanelClose = ()=> setOpenCmdPanel(false);

  const cmdoptions = useMemo(()=>{
    let filteredCmds: IChatCommand[] = [];
    let matchedCmd: IChatCommand|undefined;
    let filteredCmdOptions: Array<any> =[];
    if (newMessage.startsWith('/')) {
      const words=newMessage.substring(1).split(' ');
      if (words.length < 2) {
        const parts = words[0].split(':');
        filteredCmds = (commands||[]).filter(c=>c.name.startsWith(parts[0]));
        if (filteredCmds.length===1) {
          matchedCmd=filteredCmds[0];
          console.log(matchedCmd);
          if(matchedCmd && matchedCmd.options?.choices) {
            filteredCmdOptions = (matchedCmd.options?.choices||[]).filter((o:any)=>o.id.startsWith(parts[1]));
            console.log(filteredCmdOptions);
          }
        }
      }
    }
    return {filteredCmds, filteredCmdOptions, matchedCmd};
  },[newMessage, commands]);

  const handleMessageKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setMsgEl(e.target as HTMLInputElement);
    if ((e.key==='Tab' || e.key==='ArrowRight') && newMessage.startsWith('/')) {
      const parts = newMessage.split(':');
      if (parts.length===1) {
        setNewMessage('/' + cmdoptions.filteredCmds[0].name + ':')
      } else if (cmdoptions.filteredCmdOptions.length>0) {
        setNewMessage('/' + cmdoptions.matchedCmd?.name + ':' + cmdoptions.filteredCmdOptions[0].id)
      }
      e.preventDefault();
      e.stopPropagation();
    }
    if (e.key === 'Enter') {
      if (e.shiftKey || e.altKey) {
        // setNewMessage(prev => prev + '\n');
      }
      else {
        e.preventDefault();
        props.message?handleRegenerate():onSend();
      }
    }
  };

  const handleStopSpeaking = useCallback(()=>{
    if (isRecording){
      stopSpeechToText();
    }
  },[isRecording, stopSpeechToText,]);

  const onExit = () => { setIntroState((prev) => ({...prev, stepsEnabled: false }));};

  const handleRegenerate = async () => {
    if (!chatsession) return;
    const lastUserMsg = props.message ? {...props.message,content:newMessage} : chatsession.messages.slice(-2)[0];

    if (!lastUserMsg) return;
    setIsBusy(true);
    setErrorMessage(undefined);
    onSend({
      id:chatsession?.id,
      options: {
        model: options.model,
        web: options.web,
        assistant: options.assistant,
        contexts: options.contexts,
        parameters,
      },
      messageid: lastUserMsg.id,
      message: lastUserMsg.content,
    });
  }

  const handleFocus = (e: any) => { }

  const cancelProcessing = ()=>{}
  const rowCount = newMessage.split('').filter(c => c === '\n').length + 1;
  return (<Box className='chat-message-container'>
    <Snackbar
      anchorOrigin={{ vertical:'bottom', horizontal:'center' }}
      open={snackbarMessage !== ''}
      autoHideDuration={5000}
      onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
    </Snackbar>
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
      component="div" {...getRootProps()}
      sx={theme=>({ p: '2px 4px', width: '100%', backgroundColor: theme.palette.background.default, position:'relative',
      border:`2px solid ${isDragActive? theme.palette.primary.light : theme.palette.background.default}`})}
    >
      <input style={{position:'absolute', top:0, left:0, bottom:0, right:0,}}
        {...getInputProps()}
      />
      {(cmdoptions.filteredCmds.length>0 && cmdoptions.filteredCmdOptions.length===0) ? <Paper elevation={6}
        sx={{position:'absolute', left:{xs:12, sm:(44+newMessage.length*12)},zIndex:100,
          minWidth: '300px', minHeight:'200px',...(chatsession?{bottom:52}:{top:52}),}}>
        <Typography sx={{ p: 2 }}>Commands</Typography>
        <Divider/>
        <div className='scrollbarv' style={{maxHeight:250}}>
        {cmdoptions.filteredCmds.map((c,i)=>{
          const parts=c.options?.example.split(':');
          return <ListItemButton key={c.name} onClick={(e)=>{setNewMessage(`/${c.name}:`);iref.current?.focus();}} >
            <ListItemText
              primary={<span><strong>{parts[0].substring(0,newMessage.length-1)}</strong>{parts[0].substring(newMessage.length-1)}:<small>{parts[1]}</small></span>}
              secondary={c.description} />
          </ListItemButton>
        })}
        </div>
      </Paper> : null}
      {cmdoptions.filteredCmdOptions.length>0 ? <Paper sx={{position:'absolute', bottom:48,
        left:{xs:12, sm:(44+newMessage.length*12)},
        minWidth: '300px', Height:'200px'}}>
        <Typography sx={{ p: 2 }}>{cmdoptions.matchedCmd?.name} options:</Typography>
        <Divider/>
        {cmdoptions.filteredCmdOptions.map((c,i)=>{
          return <ListItemButton key={c.id} onClick={(e)=>{setNewMessage(`/${cmdoptions.matchedCmd?.name}:${c.id}`); iref.current?.focus()}} >
            <ListItemText
              primary={<span>/{cmdoptions.matchedCmd?.name}:<strong>{c.id}</strong></span>}
              secondary={c.name} />
          </ListItemButton>
        })}
      </Paper> : null}
      <Stack direction={'row'} spacing={0.5} alignItems={'center'}>
        {Object.keys(files).length>0 ? <Box>

          <TPopover element={(onClick, did) => <Chip aria-describedby={did} onClick={onClick}
            avatar={<Avatar><FolderIcon sx={{fontSize:'16px'}}/></Avatar>} sx={{ml:1,}}
            label={`${Object.keys(files).length} file${Object.keys(files).length>1?'s':''}`}
            variant="outlined" size='small'/>}
            PaperProps={{
              sx: {minWidth:'200px', minHeight:'250px',p:2}
            }}
          >
            <Typography>Files that will be uploaded</Typography>
            <Divider/>
            {Object.keys(files).map(fname =><ListItem key={fname}>
                <ListItemText primary={fname} secondary={`${files[fname].path} bytes`} />
              </ListItem>)}
          </TPopover>
        </Box>:null}
        {showOptions?null:<Typography variant='caption'><em>model:</em></Typography>}
        {showOptions?null:<Typography variant='caption' color={'primary'}><strong>{options.model}</strong>&nbsp;</Typography>}
        {showOptions?null:options.web && <Typography variant='caption'><em>useWeb:</em></Typography>}
        {showOptions?null:options.web && <Typography variant='caption' color={'primary'}><strong>{options.web.count}</strong>&nbsp;</Typography>}
        {/* <ChatCmdList commands={[
          {label:'model', name:options.model, icon:<PsychologyIcon fontSize='small' color={showOptions?'secondary':'inherit'} sx={{transform:'scale(-1,1)'}}/>}
          ]}
          onClick={(e,c)=>{console.log(c)}}/> */}
      </Stack>
      <Box sx={{display: 'flex', alignItems: 'center', width: '100%',}}>
        <IconButton sx={{ p: '10px' }} aria-label="settings" onClick={()=>setShowOptions(!showOptions)}>
          <PsychologyIcon color={showOptions?'secondary':'inherit'} sx={{transform:'scale(-1,1)'}}/>
        </IconButton>
        <InputBase multiline rows={rowCount} inputRef={iref}
          sx={{ ml: 1, flex: 1 }} autoFocus
          error={errorMessage!==undefined}
          placeholder="Type your message here (use shift/alt+enter for a new line)..."
          inputProps={{
            'aria-label': 'chat message box' ,
            speech: 'speech',
            'x-webkit-speech': 'x-webkit-speech',
            'x-webkit-grammar': 'builtin:translate',
            lang: 'en'
          }}
          value={newMessage + (interimResult||'')}
          onFocus={handleFocus}
          onChange={handleNewMessageChange}
          onKeyDown={handleMessageKeyDown}
          disabled={isBusy}
        />
        {/* {!speechError ? <IconButton sx={{ p: '10px' }} aria-label="settings" disabled={isBusy}
          onMouseDown={()=>{startSpeechToText();}}
          onMouseUp={handleStopSpeaking}>
          <MicIcon color={isRecording?'secondary':'inherit'}/>
        </IconButton> : null} */}
        {isBusy?<CircularProgress/>:(
        <IconButton sx={{ p: '10px' }} color={newMessage !== '' ? 'primary' : 'inherit'} disabled={newMessage === ''}
          aria-label="send message" onClick={()=>{props.message? handleRegenerate() : onSend()}}>
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
    <Dialog open={processingInput}>
      <DialogTitle>Preparing Input...</DialogTitle>
      <DialogContent>

      </DialogContent>
      <DialogActions>
        <Button onClick={cancelProcessing}>Cancel</Button>
      </DialogActions>
    </Dialog>
  </Box>
  );
}


