//import regeneratorRuntime from "regenerator-runtime";
//import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useState, ChangeEvent, useEffect } from 'react';
import { Box, CircularProgress, Divider, FormControl, InputAdornment, InputBase, InputLabel, ListSubheader, MenuItem, Paper, Select, Stack, TextField, ToggleButton } from '@mui/material';
import TelegramIcon from '@mui/icons-material/Telegram';
import PsychologyAltIcon from '@mui/icons-material/PsychologyAlt';
import IconButton from '@mui/material/IconButton';
import SettingsIcon from '@mui/icons-material/Settings';
import DisplaySettingsIcon from '@mui/icons-material/DisplaySettings';
import { AxiosError } from 'axios';
import useAxiosPrivate from 'psnapi/useAxiosPrivate';
import { useNavigate } from 'react-router-dom';
import { IChatSession } from 'sharedtypes';
import { useChatHistory } from '../api/chat';
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
  const {invalidateCache} = useChatHistory();
  const [newMessage, setNewMessage] = useState<string>('');
  const [isBusy, setIsBusy] = useState(false);
  const [model, setModel] = useState('gpt35turbo-test');
  const [assistant, setAssistant] = useState('AI Assistant');
  const [context, setContext] = useState('none');
  const [showOptions, setShowOptions] = useState(false);
  // const {
  //   transcript,
  //   listening,
  //   resetTranscript,
  //   browserSupportsSpeechRecognition
  // } = useSpeechRecognition();

  useEffect (()=>{
    setNewMessage(props.message||'');
  },[props.message]);

  const handleNewMessageChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
  };

  const onSend = async () => {
    try {
      setIsBusy(true);
      const res = await axios.post(`/api/chat/${sessionid||''}`, {
        message: newMessage,
        model,
      });
      if (res.status === 200) {
        const newSession: IChatSession = res.data;
        setNewMessage('');
        invalidateCache();
        if (props.onSuccess) {
          props.onSuccess(newSession);
        }
      }
    } catch (ex) {
      const ar = ex as AxiosError;
      if (ar) {
        console.error(ar.message);
      }
    } finally {
      setIsBusy(false);
    }
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
    <Paper
      component="div"
      sx={theme=>({ p: '2px 4px', display: 'flex', alignItems: 'center', width: '100%', backgroundColor: theme.palette.background.default })}
    >
      <IconButton sx={{ p: '10px' }} aria-label="settings" onClick={()=>setShowOptions(!showOptions)}>
        <SettingsIcon />
      </IconButton>
      {/* {browserSupportsSpeechRecognition ? <IconButton sx={{ p: '10px' }} aria-label="settings"
        onClick={async ()=>{listening?SpeechRecognition.stopListening():SpeechRecognition.startListening()}}>
        <MicIcon color={listening?'success':'inherit'}/>
      </IconButton> : null} */}
      <InputBase
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
      <IconButton sx={{ p: '10px' }} aria-label="directions">
        <DisplaySettingsIcon />
      </IconButton>
    </Paper>
    {showOptions && <Box sx={{display:'flex', flexDirection:'row'}}>
      <FormControl sx={{ m: 1, minWidth: 180 }}>
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
          <MenuItem value={'coe-test'} disabled>CoE Test</MenuItem>
        </Select>
      </FormControl>
      <FormControl sx={{ m: 1, minWidth: 180, flexGrow:1 }}>
        <InputLabel htmlFor="assistant-select">Act as</InputLabel>
        <Select id="assistant-select" label="Act as" size='small'
          value={assistant}
          onChange={(e)=>setAssistant(e.target.value as string)}
        >
          <MenuItem value={'AI Assistant'}>AI Assistant</MenuItem>
        </Select>
      </FormControl>
      <FormControl sx={{ m: 1, minWidth: 180 }}>
        <InputLabel htmlFor="assistant-select">Additional Context</InputLabel>
        <Select id="assistant-select" label="Additional Context" size='small'
          value={context}
          onChange={(e)=>setContext(e.target.value as string)}
        >
          <MenuItem value={'none'}>none</MenuItem>
        </Select>
      </FormControl>
    </Box>}
  </Box>
  );
}
