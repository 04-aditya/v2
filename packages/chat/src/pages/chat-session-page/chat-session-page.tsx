import { Alert, AlertTitle, Avatar, Box, FormControl, Grid, InputBase, InputLabel, LinearProgress, ListSubheader, MenuItem, Paper, Select, TextField, Toolbar, Typography } from '@mui/material';
import styles from './chat-session-page.module.css';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown'
import gfm from 'remark-gfm'
import CodeBlock from "sharedui/components/CodeBlock";
import { useChatSession } from '../../api/chat';
import { ChatTextField } from '../../components/ChatTextField';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter'
import {dark, coy, okaidia} from 'react-syntax-highlighter/dist/esm/styles/prism'
import { IChatMessage, IChatSession } from 'sharedtypes';
import { useEffect, useRef, useState, useMemo, ChangeEvent } from 'react';
import PsychologyIcon from '@mui/icons-material/Psychology';
import PsychologyAltIcon from '@mui/icons-material/PsychologyAlt';
import { useTheme } from 'sharedui/theme';

/* eslint-disable-next-line */
export interface ChatSessionPageProps {}

export function ChatSessionPage(props: ChatSessionPageProps) {
  const { chatId } = useParams();
  const {data:session, invalidateCache} = useChatSession(chatId||'');
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [typeMode, setTypeMode] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [sessionGroup, setSessionGroup] = useState('');

  useEffect(() => {
    if (session) {
      setSessionName(session.name||'');
      setSessionGroup(session.group||'');

      if (session.messages.length>2 && typeMode) {
        const msgs = session.messages.slice(0,-1);
        const lastmsg = session.messages[session.messages.length-1];
        console.log(lastmsg.content);
        const words = lastmsg.content.split(' ');
        //merge consecutive spaces into one word
        for (let i=0; i<words.length-1; i++) {
          if (words[i].trim()==='' && words[i+1].trim()==='') {
            words[i]+=words[i+1];
            words.splice(i,1);
            i--;
          }
        }
        console.log(words);
        lastmsg.content='';
        setMessages([...msgs,lastmsg]);
        const intervalHandle = setInterval(()=>{
          if (words.length>0) {
            const word=words.shift();
            lastmsg.content += word + ' ';
            setMessages([...msgs,lastmsg]);
            return;
          }
          clearInterval(intervalHandle);
          setTypeMode(false);
        }, 100);
        return ()=>clearInterval(intervalHandle);
      } else {
        setMessages(session.messages);
      }
    } else {
      setMessages([]);
    }
  }, [session, typeMode]);

  const handleSessionUpdate = (session: IChatSession) => {
    setTypeMode(true);
    invalidateCache();
  }

  const handleSessionNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    if (newName.length<45) {
      setSessionName(newName);
    } else {
      setSessionName(newName.substring(0,45));
    }
  }
  const handleSessionGroupChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newGroup = e.target.value;
    if (newGroup.length<45) {
      setSessionGroup(newGroup);
    } else {
      setSessionGroup(newGroup.substring(0,45));
    }
  }

  return (
    <Paper elevation={2}
      sx={theme=>({display:'flex', height:'100%', flexDirection:'column', justifyContent:'space-between', p:{xs:0, sm:1},})}>
      {session?(
        <Box sx={{flex:1, display:'flex', flexDirection:'column', maxHeight:'100%', p:2}}>
          <Toolbar variant='dense' sx={{display:'flex', justifyContent:'space-around', flexDirection:'row'}}>
          </Toolbar>
          <Box sx={{flexGrow:1, pt:1}} className="scrollbarv">
            <Grid container sx={{mb:0.5}}>
              <Grid item xs={12} sm={9}>
                <TextField label='Name' value={sessionName} onChange={handleSessionNameChange} fullWidth size='small' sx={{pr:0.5}}/>
              </Grid>
              <Grid xs={12} sm={3}>
                <TextField label='Group' value={sessionGroup} onChange={handleSessionGroupChange} fullWidth size='small'/>
              </Grid>
            </Grid>
            {messages.map((m,idx)=>( idx===0?(
              <Alert key={idx} severity='info' sx={{mb:1, mx:2}}>
                <AlertTitle>Chat Model initial instruction</AlertTitle>
                <p>{m.content}</p>
              </Alert>
            ):<MessageItem key={m.id} message={m}/>))}
          </Box>
          <ChatTextField sessionid={session?.id} onSuccess={handleSessionUpdate}/>
        </Box>
      ) : <LinearProgress/>}
    </Paper>
  );
}

export default ChatSessionPage;


function MessageContent(props: { message:IChatMessage}) {
  const {mode} = useTheme();
  const {message:m} = props;
  const isUser = m.role==='user';
  const codeStyle = useMemo(()=>{
    console.log(mode);
    return (mode === 'dark' ? okaidia : coy);
  },[mode]);

  return <Box sx={(theme)=>({px:1, border:'0px solid gray', overflow:'auto',
    ml: {xs:0, sm:isUser?8:0}, mr: {xs:0, sm:isUser?0:8},
    borderLeftWidth:isUser?'0px':'2px', borderRightWidth:isUser?'2px':'0px',
    borderColor:(isUser?theme.palette.primary.light:theme.palette.secondary.light),
    backgroundColor: isUser?theme.palette.background.default:'transparent',
  })}>
  <ReactMarkdown children={m.content} className='message-content'
    remarkPlugins={[gfm]}
    components={{
      code({node, inline, className, children, ...props}) {
        const match = /language-(\w+)/.exec(className || '')
        return !inline && match ? (
          <SyntaxHighlighter
            {...props}
            children={String(children).replace(/\n$/, '')}
            style={codeStyle}
            language={match[1]}
            PreTag="div"
          />
        ) : (
          <code {...props} className={className}>
            {children}
          </code>
        )
      }
    }}
  />
</Box>
}
function MessageItem(props: { message:IChatMessage }) {
  const {message:m} = props;
  const ref = useRef<HTMLDivElement>(null);
  const isUser = m.role==='user';
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [props.message.content]);

  return (
    <div ref={ref}>
      {isUser?<Box key={m.id} sx={{display:'flex', flexGrow:1, flexDirection:'row-reverse', alignItems:'flex-start',}}>
        <Avatar alt='user avatar' sx={{mt:2, width: 24, height: 24, background:'transparent', display:{xs:'none', sm:'block'}}}>
          <PsychologyAltIcon color='primary'/>
        </Avatar>
        <MessageContent message={m} />
      </Box>:<Box key={m.id} sx={{display:'flex', flexDirection:'row', alignItems:'flex-start',mb:1}}>
        <Avatar alt='bot avatar' sx={{mt:1, width: 24, height: 24, background:'transparent', display:{xs:'none', sm:'block'}}}>
          <PsychologyIcon color='secondary' sx={{transform:'scale(-1,1)'}}/>
        </Avatar>
        <MessageContent message={m} />
      </Box>}
    </div>
  );
}
