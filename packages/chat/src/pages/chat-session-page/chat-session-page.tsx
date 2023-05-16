import { Alert, AlertTitle, AppBar, Autocomplete, Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, Grid, IconButton, InputBase, InputLabel, LinearProgress, ListSubheader, MenuItem, Paper, Popover, Select, Snackbar, Stack, SxProps, TextField, Toolbar, Typography, alpha, useMediaQuery, useTheme } from '@mui/material';
import styles from './chat-session-page.module.css';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown'
import gfm from 'remark-gfm'
import CodeBlock from "sharedui/components/CodeBlock";
import { useChatSession, useChatSessionFavourite } from '../../api/chat';
import { ChatTextField } from '../../components/ChatTextField';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter'
import {dark, coy, okaidia} from 'react-syntax-highlighter/dist/esm/styles/prism'
import { IChatMessage, IChatSession } from 'sharedtypes';
import { useEffect, useRef, useState, ChangeEvent, useCallback, useLayoutEffect, SyntheticEvent, useMemo } from 'react';
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
import LabelImportantIcon from '@mui/icons-material/LabelImportant';
import ReviewsIcon from '@mui/icons-material/Reviews';
import DeleteIcon from '@mui/icons-material/Delete';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShareIcon from '@mui/icons-material/Share';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import useAxiosPrivate from 'psnapi/useAxiosPrivate';
import { useQueryClient } from '@tanstack/react-query';
import EditIcon from '@mui/icons-material/Edit';
import mermaid from 'mermaid';

mermaid.initialize({});

/* eslint-disable-next-line */
export interface ChatSessionPageProps {}


export function InitialInstructionPopover(props:{message:IChatMessage}) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <div>
      <Stack direction={'row'} spacing={1} sx={{pl:1}}>
        <ReviewsIcon/>
        <Typography
          aria-owns={open ? 'chatinstruction-popover' : undefined}
          aria-haspopup="true"
          onMouseEnter={handlePopoverOpen}
          onMouseLeave={handlePopoverClose}
        >
          Initial chat instructions...
        </Typography>
      </Stack>
      <Popover
        id="chatinstruction-popover"
        sx={{
          pointerEvents: 'none',
        }}
        open={open}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        onClose={handlePopoverClose}
        disableRestoreFocus
      >
        <Alert severity='info' sx={{}}>
          <AlertTitle>Initial instruction</AlertTitle>
          <p>{`${props.message.content}`}</p>
        </Alert>
      </Popover>
    </div>
  );
}

export function ChatSessionPage(props: ChatSessionPageProps) {
  const axios = useAxiosPrivate();
  const { auth } = useAuth();
  const { chatId } = useParams();
  const {data:serverSession, isLoading, isError, error, mutation, invalidateCache} = useChatSession(chatId||'');
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [typeMode, setTypeMode] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [sessionTags, setSessionTags] = useState<string[]>([]);
  const [isMouseOver, setIsMouseOver] = useState(false);
  const [session, setSession] = useState<IChatSession>();
  const {data:isFavourite, mutation:favMutation, invalidateCache: favInvalidateCache} = useChatSessionFavourite(session?.id);
  const [editMessage, setEditMessage] = useState<IChatMessage>();

  useEffect(()=>{
    setSession(serverSession);
  },[serverSession])

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

  const handleSessionUpdate = (updatedSession: IChatSession) => {
    setTypeMode(true);
    //invalidateCache();
    setSession(updatedSession);
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

  const toggleFavourite = useCallback((e: SyntheticEvent) => {
    e.stopPropagation();
    if (!session) return;
    favMutation.mutateAsync(!isFavourite)
      .then(() => {
        favInvalidateCache();
      })
      .catch((err) => {
        console.error(err);
      });
      return true;
  },[favInvalidateCache, favMutation, isFavourite, session]);

  const toggleSharing = useCallback((e: SyntheticEvent) => {
    if (!session) return;
    axios.post(`/api/chat/${session.id}/sharing`,{
      type: session.type==='public'?'private':'public'
    })
    .then(() => {
      setSession({...session, type:session.type==='public'?'private':'public'});
    })
    .catch((err)=>console.error(err));

    return true;
  }, [axios, session]);

  const isShared = useMemo(()=>(session?.type==='public'),[session?.type]);
  const canEdit = auth.user?.email===session?.userid;
  const isSaveButtonDisabled = !canEdit || !(sessionName!==session?.name || sessionTags !==session?.tags);

  return (
    <Paper elevation={2}
      sx={theme=>({display:'flex', height:'100%', flexDirection:'column', justifyContent:'space-between',
        p:{xs:0, sm:1}, backgroundColor: alpha(theme.palette.background.paper, 0.5) })}>
      {isLoading && <LinearProgress/>}
      {isError && <Alert severity='error'>{error.response?.status===404?'Not Found':error.message}</Alert>}
      {session?(
        <Box sx={{flex:1, display:'flex', flexDirection:'column', maxHeight:'100%', p:2}}>
          <AppBar position='static' sx={theme => ({
              borderRadius:1, backgroundColor: isMouseOver && canEdit?theme.palette.background.paper:'transparent',
              transition: theme.transitions.create('height', {
                easing: theme.transitions.easing.sharp,
                duration: isMouseOver ? theme.transitions.duration.leavingScreen : theme.transitions.duration.enteringScreen,
              }),
            })} elevation={isMouseOver && canEdit?6:0}
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
                {isMouseOver && canEdit ? <Grid item xs={12} sx={{display:'flex', flexDirection:'row', alignItems:'center'}}>
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
                </Grid> : <Grid item xs={12} sm={3} sx={{display:'flex', flexDirection:'row', flexWrap:'wrap', alignItems:'center'}}>
                  {sessionTags.map((tag,idx)=>(
                    <Chip key={tag} size='small' variant='outlined' label={tag} sx={{ml:1, mb:0.5}}/>
                  ))}
                </Grid>}
              </Grid>
              <Stack direction={'row'} spacing={1}>
                <IconButton size='small' onClick={handleUpdateSessionAttrs} disabled={isSaveButtonDisabled}>
                  <SaveAsIcon/>
                </IconButton>
                <IconButton size='small' onClick={toggleFavourite} disabled={!canEdit}>
                  {isFavourite?<FavoriteIcon color='secondary'/>:<FavoriteBorderIcon/>}
                </IconButton>
                <IconButton size='small' onClick={toggleSharing} disabled={!canEdit}>
                  <ShareIcon color={isShared?'info':'inherit'}/>
                </IconButton>
              </Stack>
            </Toolbar>
          </AppBar>
          <Box sx={{flexGrow:1, pt:2}} className="scrollbarv" tabIndex={0}>
            {messages.map((m,idx)=>( idx===0?(
              <InitialInstructionPopover key={idx} message={m}/>
            ):<MessageItem key={m.id} message={m} onChange={(m)=>{
                if (m) {
                  const newSession = {...session};
                  newSession.messages=[];
                  for(let i = 0; i<session.messages.length; i++) {
                    const em = session.messages[i];
                    if (em.id===m.id) break;
                    newSession.messages.push(em);
                  };
                  setSession(newSession);
                } else {
                  invalidateCache();
                }
                setEditMessage(m)
              }} />))}
            <EndofChatMessagesBlock key={messages.slice(-1)[0]?.content.length+''+typeMode} complete={!typeMode}/>
          </Box>
          {canEdit ? <ChatTextField session={session} message={editMessage} onSuccess={handleSessionUpdate} showRegenerate={canEdit}/> : null}
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
        //const mermaid: any = (global.window as any).mermaid;
        //mermaid.contentLoaded();
        //mermaid.run();
      }, 500);
    }
  },[props.complete]);
  return <div ref={ref} style={{minHeight:props.complete?16:48}}>
  </div>
}

function CodeContent(args:any) {
  const {mode} = useThemeMode();
  const [svg, setSvg] = useState<string>('');
  const {node, inline, className, children, partial, ...props} = args;
  const match = /language-(\w+)/.exec(className || '');

  useEffect(()=>{
    if (className === 'language-mermaid' && !partial) {
      const mcode = `%%{
  init: {
    'theme': ${mode === 'dark' ? 'dark' : 'default'}, 'htmlLabels': true
  }
}%%

` + [...children].join('');
      // console.log(mcode);
      mermaid.render('mermaid-svg', mcode)
        .then(res=>{
          setSvg(res.svg);
        })
    }
  },[partial, className, children, mode]);

  if (className === 'language-llm-observation') {
    return <Box sx={{p:1, backgroundColor:'#e8e8e8'}}>
      <Typography variant='body2'>{children}</Typography>
    </Box>
  }
  if (className === 'language-mermaid' && !partial) {
    return <Grid container>
      <Grid item xs={12} sm={6}>
        <div dangerouslySetInnerHTML={{__html:svg}}/>
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

interface MessageProps {
  message: IChatMessage;
  onChange?: (message?: IChatMessage)=>void;
}

function MessageContent(props: MessageProps) {
  const {message:m, onChange=()=>{}} = props;
  const [openReasoning, setOpenReasoning] = useState(false);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleSnackbarClose = (event: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }

    setSnackbarMessage('')
  };

  const showSnackbar = (msg: string)=>{
    setSnackbarMessage(msg);
  }

  const handleClickOpen = () => {
    setOpenReasoning(true);
  };

  const handleClose = () => {
    setOpenReasoning(false);
  };
  const isUser = m.role==='user';
  const followup_questions = m.options?.followup_questions as string[] || [];
  const refs = m.options?.references||{};
  return <Paper sx={(theme)=>({
      pl:1, pr:(isUser?3:1), pt:isUser?0:2, border:'0px solid gray', overflow:'auto',
      ml: {xs:0, sm:isUser?8:0}, mr: {xs:0, sm:isUser?0:8},
      borderRadius: 1, width: '95%', position: 'relative',
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
    {isUser?<IconButton size='small' color={isEditing?'primary':'default'} sx={{position:'absolute', top:'calc(50% - 16px)', right:0}}
      onClick={()=>{
        setIsEditing(e=>{
          if (e) {
            onChange();
            return false;
          } else {
            onChange(m)
            return true;
          }
        });
      }}>
      <EditIcon/>
    </IconButton>:<IconButton size='small' sx={{position:'absolute', top:0, right:0}} onClick={()=>{
      navigator.clipboard.writeText(m.content);
      showSnackbar('Copied to clipboard');
    }}>
      <ContentCopyIcon/>
    </IconButton>}
    <Snackbar
      anchorOrigin={{ vertical:'top', horizontal:'center' }}
      open={snackbarMessage !== ''}
      autoHideDuration={6000}
      onClose={handleSnackbarClose}>
      <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%' }}>
        {snackbarMessage}
      </Alert>
    </Snackbar>
    <Stack direction={'row'} flexWrap={'wrap'} spacing={2}>
      {Object.keys(refs).map((r:any, i:number)=><a href={refs[r]}><Typography key={i} variant='caption'><strong>[{r}]</strong>&nbsp;{refs[r]}</Typography></a>)}
    </Stack>
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
        <DialogContent className='scrollbarv'>
          <MarkDown children={m.options.intermediate_content}/>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </>: null}

</Paper>
}
function MessageItem(props: MessageProps) {
  const {message:m} = props;
  const ref = useRef<HTMLDivElement>(null);
  const isUser = m.role==='user';

  return (
    <div ref={ref}>
      {isUser?<Box key={m.id} sx={{display:'flex', pr:1, flexGrow:1, flexDirection:'column', alignItems:'flex-end',}}>
        <Avatar alt='user avatar' sx={theme=>({mt:1, mr:-1, mb:-1.5,
          width: 24, height: 24, zIndex:1,
          background: theme.palette.background.default,
          borderWidth:1, borderStyle: 'solid', borderColor: theme.palette.primary.main,
          display:{xs:'none', sm:'block'}})}>
          <PsychologyAltIcon color='primary'/>
        </Avatar>
        <MessageContent message={m} onChange={props.onChange}/>
      </Box>:<Box key={m.id} sx={{display:'flex',pl:1, flexDirection:'column', alignItems:'flex-start',my:1}}>
        <Avatar alt='bot avatar' sx={theme=>({mt:1, ml:-1, mb:-1.5,
          width: 28, height: 28, zIndex:1,
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
