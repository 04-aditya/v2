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
import { PaletteMode } from '@mui/material';
import ContextSelect from '../../components/ContextSelect';

/* eslint-disable-next-line */
export interface ChatSessionPageProps {}

export function ChatSessionPage(props: ChatSessionPageProps) {
  const {mode} = useTheme();
  const { chatId } = useParams();
  const {data:session, invalidateCache} = useChatSession(chatId||'');

  const handleSessionUpdate = (session: IChatSession) => {
    invalidateCache();
  }

  return (
    <Paper elevation={4}
      sx={theme=>({display:'flex', height:'100%', flexDirection:'column', justifyContent:'space-between', p:1,})}>
      {session?(
      <Box sx={{flex:1, display:'flex', flexDirection:'column', maxHeight:'100%', p:2}}>
        <Toolbar variant='dense' sx={{display:'flex', justifyContent:'space-around', flexDirection:'row'}}>
        </Toolbar>
        <Box sx={{flexGrow:1,}} className="scrollbarv">
          {session?.messages.map((m,idx)=>idx>0?<MessageItem message={m} mode={mode}/>:null)}
        </Box>
        <ChatTextField sessionid={session?.id} onSuccess={handleSessionUpdate}/>
      </Box>
      ) : <LinearProgress/>}
    </Paper>
  );
}

export default ChatSessionPage;


function MessageContent(props: { message:IChatMessage, mode:string}) {
  const {message:m} = props;
  const isUser = m.role==='user';
  const codeStyle = useMemo(()=>{
    console.log(props.mode);
    return (props.mode === 'dark' ? okaidia : coy);
  },[props.mode]);

  return <Box sx={(theme)=>({px:1, border:'0px solid gray', overflow:'auto',
    ml: isUser?8:0, mr: isUser?0:8,
    borderLeftWidth:isUser?'0px':'2px', borderRightWidth:isUser?'2px':'0px',
    borderColor:(isUser?theme.palette.primary.light:theme.palette.secondary.light),
    backgroundColor: isUser?theme.palette.background.default:'transparent',
  })}>
  <ReactMarkdown children={m.content}
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
function MessageItem(props: { message:IChatMessage, mode: string}) {
  const {message:m} = props;
  const ref = useRef<HTMLDivElement>(null);
  const isUser = m.role==='user';
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, []);

  return (
    <div ref={ref}>
      {isUser?<Box key={m.id} sx={{display:'flex', flexGrow:1, flexDirection:'row-reverse', alignItems:'flex-start',}}>
        <Avatar alt='user avatar' sx={{mt:2, width: 24, height: 24, background:'transparent'}}>
          <PsychologyAltIcon color='primary'/>
        </Avatar>
        <MessageContent message={m} mode={props.mode}/>
      </Box>:<Box key={m.id} sx={{display:'flex', flexDirection:'row', alignItems:'flex-start',mb:1,}}>
        <Avatar alt='bot avatar' sx={{mt:1, width: 24, height: 24, background:'transparent'}}>
          <PsychologyIcon color='secondary'/>
        </Avatar>
        <MessageContent message={m} mode={props.mode}/>
      </Box>}
    </div>
  );
}
