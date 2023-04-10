import { Avatar, Box, FormControl, InputLabel, LinearProgress, ListSubheader, MenuItem, Paper, Select, Toolbar, Typography } from '@mui/material';
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
import { useEffect, useRef, useState, useMemo } from 'react';
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

  useEffect(() => {
    if (session && session.messages) {
      if (session.messages.length>2 && typeMode) {
        const msgs = session.messages.slice(1,-1);
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
  }, [session]);

  const handleSessionUpdate = (session: IChatSession) => {
    setTypeMode(true);
    invalidateCache();
  }

  return (
    <Paper elevation={2}
      sx={theme=>({display:'flex', height:'100%', flexDirection:'column', justifyContent:'space-between', p:1,})}>
      {session?(
      <Box sx={{flex:1, display:'flex', flexDirection:'column', maxHeight:'100%', p:2}}>
        <Toolbar variant='dense' sx={{display:'flex', justifyContent:'space-around', flexDirection:'row'}}>
        </Toolbar>
        <Box sx={{flexGrow:1,}} className="scrollbarv">
          {messages.map((m,idx)=><MessageItem message={m}/>)}
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
    ml: isUser?8:0, mr: isUser?0:8,
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
        <Avatar alt='user avatar' sx={{mt:2, width: 24, height: 24, background:'transparent'}}>
          <PsychologyAltIcon color='primary'/>
        </Avatar>
        <MessageContent message={m} />
      </Box>:<Box key={m.id} sx={{display:'flex', flexDirection:'row', alignItems:'flex-start',mb:1,}}>
        <Avatar alt='bot avatar' sx={{mt:1, width: 24, height: 24, background:'transparent'}}>
          <PsychologyIcon color='secondary'/>
        </Avatar>
        <MessageContent message={m} />
      </Box>}
    </div>
  );
}
