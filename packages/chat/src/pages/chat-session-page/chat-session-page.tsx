import { Alert, AlertTitle, AppBar, Autocomplete, Avatar, Box, Button, Chip, Dialog, DialogContent, DialogTitle, Divider, FormControl, Grid, IconButton, InputBase, InputLabel, LinearProgress, ListSubheader, MenuItem, Paper, Select, SxProps, TextField, Toolbar, Typography, alpha, useMediaQuery, useTheme } from '@mui/material';
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
import { useEffect, useRef, useState, ChangeEvent, useCallback, useLayoutEffect } from 'react';
import PsychologyIcon from '@mui/icons-material/Psychology';
import PsychologyAltIcon from '@mui/icons-material/PsychologyAlt';
import { useTheme as useThemeMode } from 'sharedui/theme';
import ContentEditable from "react-contenteditable";
import rehypeRaw from "rehype-raw";
import rehypeColorChips from 'rehype-color-chips';
import rehypeExternalLinks from 'rehype-external-links';
import useAuth from "psnapi/useAuth";
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { UserAvatar } from '../../components/UserAvatar';
import SaveIcon from '@mui/icons-material/Save';
import SaveAsIcon from '@mui/icons-material/SaveAs';
import TagsTextField from '../../components/TagsTextField';

/* eslint-disable-next-line */
export interface ChatSessionPageProps {}

export function ChatSessionPage(props: ChatSessionPageProps) {
  const { auth } = useAuth();
  const { chatId } = useParams();
  const {data:session, isLoading, isError, error, mutation, invalidateCache} = useChatSession(chatId||'');
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [typeMode, setTypeMode] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [sessionTags, setSessionTags] = useState<string[]>([]);
  const [newTag, setNewtag] = useState('');
  const [isMouseOver, setIsMouseOver] = useState(false);

  useEffect(() => {
    if (session) {
      setSessionName(session.name||'');
      setSessionTags(session.tags||[]);

      if (session.messages.length>2 && typeMode) {
        const msgs = session.messages.slice(0,-1);
        const lastmsg = session.messages[session.messages.length-1];
        lastmsg.partial = true;
        // console.log(lastmsg.content);
        const words = lastmsg.content.split(' ');
        //merge consecutive spaces into one word
        for (let i=0; i<words.length-1; i++) {
          if (words[i].trim()==='' && words[i+1].trim()==='') {
            words[i]+=words[i+1];
            words.splice(i,1);
            i--;
          }
        }
        // console.log(words);
        lastmsg.content='';
        setMessages([...msgs,lastmsg]);
        const intervalHandle = setInterval(()=>{
          if (words.length>0) {
            const word=words.shift();
            lastmsg.content += word + ' ';
            setMessages([...msgs,lastmsg]);
            return;
          }
          //add final word
          const srelem = global.window.document.querySelector('#finalMessage');
          if (srelem) {
            srelem.textContent=lastmsg.content;
          }
          clearInterval(intervalHandle);
          setTypeMode(false);
          lastmsg.content+='\n';
          lastmsg.partial = false;
          setMessages([...msgs,lastmsg]);
        }, 50);
        return ()=>clearInterval(intervalHandle);
      } else {
        setMessages(session.messages);
        const srelem = global.window.document.querySelector('#finalMessage');
        if (srelem && session.messages.length>0) {
          srelem.textContent=session.messages[session.messages.length-1].content;
        }
      }
    } else {
      setMessages([]);
    }
  }, [session, typeMode]);

  // useLayoutEffect(()=>{
  //   console.log('useLayoutEffect ' + __filename);
  //   mermaid.contentLoaded();
  // },[]);

  const handleSessionUpdate = (session: IChatSession) => {
    setTypeMode(true);
    invalidateCache();
  }

  const handleSessionNameChange = useCallback((e: {target:{value:string}}) => {
    const newName = e.target.value.substring(0,45);
    setSessionName(newName);
    console.log(newName);
  },[setSessionName]);

  const handleUpdateSessionAttrs = ()=>{
    if (session) {
      const data = { id:session.id, name: sessionName, tags: sessionTags};
      console.log(data);
      mutation.mutate(data,
      {
        onSuccess: (updatedSession)=>{
          console.log(updatedSession);
          session.name = sessionName;
          session.tags = sessionTags;
          // not required avoid refresh jank
          // invalidateCache()
        },
        onError: (err)=>{
          console.error(err);
        }
      });
    }
  };

  const handleNewTagChange = useCallback((e: {target:{value:string}}) => {
    const newTag = e.target.value.substring(0,32);
    setNewtag(newTag);
  },[setNewtag]);

  const isSaveButtonDisabled = !(sessionName!==session?.name || sessionTags!==session?.tags);

  return (
    <Paper elevation={2}
      sx={theme=>({display:'flex', height:'100%', flexDirection:'column', justifyContent:'space-between',
        p:{xs:0, sm:1}, backgroundColor: alpha(theme.palette.background.paper, 0.5) })}>
      {isLoading && <LinearProgress/>}
      {isError && <Alert severity='error'>{error.response?.status===404?'Not Found':error.message}</Alert>}
      {session?(
        <Box sx={{flex:1, display:'flex', flexDirection:'column', maxHeight:'100%', p:2}}>
          <AppBar position='static' sx={theme => ({
              borderRadius:1, backgroundColor: isMouseOver?theme.palette.background.paper:'transparent',
              transition: theme.transitions.create('height', {
                easing: theme.transitions.easing.sharp,
                duration: isMouseOver ? theme.transitions.duration.leavingScreen : theme.transitions.duration.enteringScreen,
              }),
            })} elevation={0}
            onMouseEnter={()=>setIsMouseOver(true)}
            onMouseLeave={()=>setIsMouseOver(false)}>
            <Toolbar variant='dense' sx={{display:'flex', justifyContent:'space-around', flexDirection:'row',ml:-2, mr:-2, py:0.5}}>
              <Grid container>
                <Grid item xs={12} sm={9} sx={{display:'flex', flexDirection:'row', alignItems:'center'}}>
                    <UserAvatar id={session.userid}/>
                    &nbsp;
                    <ContentEditable
                      className="editable"
                      style={{display:'flex', height:'100%', width:'100%', alignItems:'center', fontSize:'1.5em', fontWeight:'bold' }}
                      tagName="div"
                      html={sessionName} // innerHTML of the editable divble edition
                      onChange={handleSessionNameChange} // handle innerHTML change
                    />
                </Grid>
                {isMouseOver ? <Grid item xs={12} sx={{display:'flex', flexDirection:'row', alignItems:'center'}}>
                  <Autocomplete fullWidth
                    multiple size='small'
                    id={'session-tags'}
                    options={['strategy', 'product', 'experience', 'engineering', 'data']}
                    defaultValue={[]}
                    value={sessionTags}
                    onChange={(event: any, newValue: string[] | null) => {
                      setSessionTags(newValue || []);
                    }}
                    freeSolo
                    sx={{pl:4.5, pt:1}}
                    renderTags={(value: readonly string[], getTagProps) =>
                      value.map((option: string, index: number) => (
                        <Chip variant={'outlined'} size='small' label={option} {...getTagProps({ index })} />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        variant={'standard'}
                        label={'tags'}
                        placeholder={'category tags ...'}
                      />
                    )}
                  />
                </Grid> : <Grid item xs={12} sm={3} sx={{display:'flex', flexDirection:'row', alignItems:'center'}}>
                  {sessionTags.map((tag,idx)=>(
                    <Chip size='small' label={tag}/>
                  ))}
                </Grid>}
              </Grid>
              <IconButton onClick={handleUpdateSessionAttrs} disabled={isSaveButtonDisabled}>
                <SaveAsIcon/>
              </IconButton>
            </Toolbar>
          </AppBar>
          <Box sx={{flexGrow:1, pt:2}} className="scrollbarv" tabIndex={0}>
            {messages.map((m,idx)=>( idx===0?(
              <Alert key={idx} severity='info' sx={{mb:1, mx:{xs:0, sm:3}}}>
                <AlertTitle>Chat Model initial instruction</AlertTitle>
                <p>{m.content.split('\n')[0]}</p>
              </Alert>
            ):<MessageItem key={m.id} message={m} />))}
            <EndofChatMessagesBlock key={messages.slice(-1)[0]?.content.length+''+typeMode} complete={!typeMode}/>
          </Box>
          {auth.user?.email===session?.userid ? <ChatTextField sessionid={session?.id} onSuccess={handleSessionUpdate}/> : null}
        </Box>
      ) : null}
    </Paper>
  );
}

export default ChatSessionPage;

function EndofChatMessagesBlock(props:{complete: boolean}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, []);

  useEffect(()=>{
    if (props.complete) {
      setTimeout(()=>{
        const mermaid: any = (global.window as any).mermaid;
        mermaid.contentLoaded();
        mermaid.run();
      }, 500)
    }
  },[props.complete]);
  return <div ref={ref} style={{minHeight:props.complete?16:48}}>
  </div>
}

function CodeContent(args:any) {
  const {mode} = useThemeMode();
  const {node, inline, className, children, partial, ...props} = args;
  const match = /language-(\w+)/.exec(className || '');

  // useLayoutEffect(()=>{
  //   if (className === 'language-mermaid' && !partial) {
  //     const mermaid: any = (global.window as any).mermaid;
  //     mermaid.contentLoaded();
  //     mermaid.run();
  //   }
  // },[partial, className]);

  if (className === 'language-llm-observation') {
    return <Box sx={{p:1, backgroundColor:'#e8e8e8'}}>
      <Typography variant='body2'>{children}</Typography>
    </Box>
  }
  if (className === 'language-mermaid' && !partial) {
    return <Grid container>
      <Grid item xs={12} sm={6}>
        <pre className='mermaid'>
        {`%%{
  init: {
    'theme': ${mode === 'dark' ? 'dark' : 'default'}, 'htmlLabels': true
  }
}%%

`}

        {children}
      </pre>
      </Grid>
      <Grid item xs={12} sm={6}>
        <pre>{children}</pre>
      </Grid>
    </Grid>
  }

  return !inline && match ? (
    <SyntaxHighlighter
      {...props}
      children={String(children).replace(/\n$/, '')}
      style={mode==='dark'?okaidia:coy}
      language={match[1]}
      PreTag="div"
    />
  ) : (<>
    {className}
    <code {...props} className={className}>
      {children}
    </code>
    </>
  )
}

const csscolor = new RegExp(/[#]([a-fA-F\d]{6}|[a-fA-F\d]{3})/gi);
function MarkDown(props:any) {
  const partial = props.partial;
  let text = props.children as string;
  text = text.replace(csscolor, '`#$1`');
  return <ReactMarkdown children={text} className='message-content'
    skipHtml={false}
    remarkPlugins={[gfm]}
    components={{
      code: (props)=><CodeContent {...props} partial={partial}/>,
    }}
    rehypePlugins={[
      rehypeRaw,
      [rehypeExternalLinks, {rel: ['nofollow']}],
      [rehypeColorChips, { customClassName: 'color-chip' }]
    ]}
  />
}

function MessageContent(props: { message: IChatMessage}) {
  const {message:m} = props;
  const [openReasoning, setOpenReasoning] = useState(false);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  const handleClickOpen = () => {
    setOpenReasoning(true);
  };

  const handleClose = () => {
    setOpenReasoning(false);
  };
  const isUser = m.role==='user';
  const followup_questions = m.options?.followup_questions as string[] || [];
  return <Paper sx={(theme)=>({
      px:1, border:'0px solid gray', overflow:'auto',
      ml: {xs:0, sm:isUser?8:0}, mr: {xs:0, sm:isUser?0:8},
      borderRadius: 1, width:'95%',
      borderLeftWidth: isUser ? '0px' : '2px', borderRightWidth:isUser?'2px':'0px',
      borderColor: (isUser ? theme.palette.primary.light : theme.palette.secondary.light),
      backgroundColor: isUser?theme.palette.background.default:theme.palette.background.paper,
    })}>
    { followup_questions.length > 0 ? <>
        <Typography variant='body1'>Need more information to further refine my answer.</Typography>
        <ul>
          {followup_questions.map((q:string,i:number)=><li key={i}>{q}</li>)}
        </ul>
      </>: null}
    <MarkDown children={m.content} partial={m.partial}/>
    {m.options?.intermediate_content ? <>
      <Button size='small' onClick={handleClickOpen}>
        show reasoning
      </Button>
      <Dialog
        fullScreen={fullScreen}
        open={openReasoning}
        onClose={handleClose}
        aria-labelledby="reasoning-dialog-title"
      >
        <DialogTitle id="reasoning-dialog-title">
          {"Intermediate reasoning..."}
        </DialogTitle>
        <DialogContent>
          <MarkDown children={m.options.intermediate_content}/>
        </DialogContent>
      </Dialog>
    </>: null}

</Paper>
}
function MessageItem(props: { message:IChatMessage }) {
  const {message:m} = props;
  const ref = useRef<HTMLDivElement>(null);
  const isUser = m.role==='user';

  return (
    <div ref={ref}>
      {isUser?<Box key={m.id} sx={{display:'flex', pr:1, flexGrow:1, flexDirection:'column', alignItems:'flex-end',}}>
        <Avatar alt='user avatar' sx={theme=>({mt:1, mr:-1, mb:-1.5,
          width: 24, height: 24,
          background: theme.palette.background.default,
          borderWidth:1, borderStyle: 'solid', borderColor: theme.palette.primary.main,
          display:{xs:'none', sm:'block'}})}>
          <PsychologyAltIcon color='primary'/>
        </Avatar>
        <MessageContent message={m}/>
      </Box>:<Box key={m.id} sx={{display:'flex',pl:1, flexDirection:'column', alignItems:'flex-start',my:1}}>
        <Avatar alt='bot avatar' sx={theme=>({mt:1, ml:-1, mb:-1.5,
          width: 28, height: 28,
          background: theme.palette.background.paper,
          borderWidth:2, borderStyle: 'solid', borderColor: theme.palette.secondary.main,
          display:{xs:'none', sm:'block'}})}>
          <PsychologyIcon color='secondary' sx={{transform:'scale(-1,1)'}}/>
        </Avatar>
        <MessageContent message={m}/>
      </Box>}
    </div>
  );
}
