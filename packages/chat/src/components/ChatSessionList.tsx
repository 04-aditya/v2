/* eslint-disable @typescript-eslint/no-empty-function */
import React, { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { FixedSizeList, ListChildComponentProps } from "react-window";
import InfiniteLoader from "react-window-infinite-loader";
import { useChatHistory, useChatSession } from "../api/chat";
import { IChatSession } from "sharedtypes";
import useAxiosPrivate from "psnapi/useAxiosPrivate";
import { Alert, Avatar, Box, Button, Divider, Fade, LinearProgress, List, ListItem, ListItemAvatar, ListItemButton, ListItemText, Paper, Stack, Typography } from "@mui/material";
import { formatDistanceToNow, parseJSON } from "date-fns";
import { useNavigate } from "react-router-dom";
import ForumIcon from '@mui/icons-material/Forum';
import useAuth from "psnapi/useAuth";
import { AxiosError } from "axios";
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShareIcon from '@mui/icons-material/Share';
export class ChatSessionListProps {
  type?: string = 'private';
  icon?: ReactNode = <ForumIcon/>;
  userid?: string;
}

export function ChatSessions(props: ChatSessionListProps) {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  // Array of items loaded so far.
  const [items, setItems] = useState<IChatSession[]>([]);
  const fetchChatSessions = async ({ pageParam = 0 }) => {
    const res = await axios('/api/chat/history?limit=10&offset=' + (pageParam*10));
    return res.data.data;
  };
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ['chathistory'],
    queryFn: fetchChatSessions,
    getNextPageParam: (lastPage, pages) =>{
      if (lastPage.length < 5) return undefined;
      return pages.length;
    }
  })

  useEffect(()=>{
    const newItems: IChatSession[] = [];
    data?.pages.forEach((group)=>{ group.forEach((item:IChatSession)=>{newItems.push(item)})});
    setItems(newItems);
  },[data])


  // If there are more items to be loaded then add an extra row to hold a loading indicator.
  const itemCount = hasNextPage ? items.length + 1 : items.length;

  // Only load 1 page of items at a time.
  // Pass an empty callback to InfiniteLoader in case it asks us to load more than once.
  const loadMoreItems:any = useMemo(()=>(isFetchingNextPage ? () => {} : fetchNextPage), [isFetchingNextPage, fetchNextPage]);

  // Every row is loaded except for our loading indicator row.
  const isItemLoaded = useCallback((index: number) => (!hasNextPage || index < items.length),[hasNextPage, items.length]);
  // Render an item or a loading indicator.
  const Item:any = (props:{ index:number, style:any }) => {
    if (!isItemLoaded(props.index)) {
      return <div style={props.style}>{""}</div>;
    }
    const session = items[props.index];

    return <Box key={session.id+'i'}
      sx={{mb:1, p:0.5, minHeight:56,display:'flex', flexDirection:'row', alignItems:'center', cursor: 'pointer',
        borderRadius:'3px',border:'1px solid #ccc', '&:hover':{borderColor:'#000'}, height:'78px',
      }}>
        {/* <IconButton size="small">{props.icon}</IconButton> */}
        <Box sx={{flexGrow:1, display:'flex', flexDirection:'column', alignItems: 'stretch', pl:0.5}} >
          <Typography variant="body2">{session.name}</Typography>
          <Stack direction="row" display={'flex'} justifyContent="end" alignItems={'flex-end'}  spacing={1} sx={{width:'100%'}}>
            <Typography variant="caption" sx={{flexGrow:1, color:'text.secondary' }}>{formatDistanceToNow(parseJSON(session.updatedAt),{addSuffix:true})}</Typography>
            <IconButton aria-label="toggle favourite" size="small">
            {session.type==='f'?<FavoriteIcon fontSize="inherit" color="secondary" />:<FavoriteBorderIcon fontSize="inherit" />}
            </IconButton>
            <IconButton aria-label="toggle sharing" size="small">
            {session.type==='public'?<ShareIcon fontSize="inherit" color="success" />:<ShareIcon fontSize="inherit" />}
            </IconButton>
            <IconButton aria-label="delete session" size="small">
              <DeleteIcon fontSize="inherit" />
            </IconButton>
          </Stack>
        </Box>
    </Box>
  };
  function renderRow(props: ListChildComponentProps) {
    const { index, style } = props;
    const session = items[props.index];

    if (!session) return <p>Loading...</p>

    return (
      <ListItem style={style} key={index} component="div" disablePadding>
        <ListItemButton>
          <ListItemText primary={session.name}
            secondary={<Stack direction="row" display={'flex'} justifyContent="end" alignItems={'center'}  spacing={1} sx={{width:'100%'}}>
            <Typography variant="caption" sx={{flexGrow:1, color:'text.secondary' }}>{formatDistanceToNow(parseJSON(session.updatedAt),{addSuffix:true})}</Typography>
            <IconButton aria-label="toggle favourite" size="small">
            {session.type==='f'?<FavoriteIcon fontSize="inherit" color="secondary" />:<FavoriteBorderIcon fontSize="inherit" />}
            </IconButton>
            <IconButton aria-label="toggle sharing" size="small">
            {session.type==='public'?<ShareIcon fontSize="inherit" color="success" />:<ShareIcon fontSize="inherit" />}
            </IconButton>
            <IconButton aria-label="delete session" size="small">
              <DeleteIcon fontSize="inherit" />
            </IconButton>
          </Stack>}
          />
        </ListItemButton>
      </ListItem>
    );
  }

  return status === 'loading' ? (
    <p>Loading...</p>
  ) : error ? (
    <Alert severity="error">Unable to load the chat sessions.</Alert>
  ) : (
    <>
      {/* <FixedSizeList
        height={400}
        width={260}
        itemSize={78}
        itemCount={itemCount}
        overscanCount={5}
      >
        {renderRow}
      </FixedSizeList> */}
      <React.Fragment>
        {items.map((session:IChatSession,i: number) => (
          <SessionSummary key={session.id} sessionid={session.id} onDelete={()=>queryClient.invalidateQueries({ queryKey: ['chathistory'] })}/>
        ))}
      </React.Fragment>
      <div>
        <Button
          onClick={() => fetchNextPage()}
          disabled={!hasNextPage || isFetchingNextPage}
        >
          {isFetchingNextPage
            ? 'Loading more...'
            : hasNextPage
            ? 'Load More >>'
            : 'Nothing more to load'}
        </Button>
      </div>
      <div>{isFetching && !isFetchingNextPage ? 'Fetching...' : null}</div>
    </>
  )
}

export function SessionSummary(props: {sessionid?: string, session?:IChatSession, onDelete?: ()=>void}) {
  const axios = useAxiosPrivate();
  const {data: session,mutation, error, isLoading, invalidateCache} = useChatSession(props.sessionid);
  const [isDeleted, setIsDeleted] = useState(false);
  const navigate = useNavigate();

  const deleteSession = useCallback(() => {
    axios.delete(`/api/chat/${session?.id}`)
    .then(() => {
      setIsDeleted(true);
      // if (props.onDelete) props.onDelete();
    })
    .catch((err)=>console.error(err))
  },[axios, session?.id]);

  const toggleSharing = useCallback(() => {
    axios.post(`/api/chat/${session?.id}/sharing`,{
      type: session?.type==='public'?'private':'public'
    })
    .then(() => {
      invalidateCache();
    })
    .catch((err)=>console.error(err))
    // mutation.mutateAsync({
    //   id: session?.id,
    //   type: session?.type==='public'?'private':'public'
    // })
    // .then((data) => {
    //   invalidateCache();
    // })
    // .catch((err)=>console.error(err))
  },[mutation, session?.id, session?.type, invalidateCache]);

  if (isLoading) return <LinearProgress/>;
  if (!session) return <Typography variant="body2">?</Typography>;
  return <Box sx={{
      mb: 1, p: 0.5, minHeight: 56, display: 'flex', flexDirection: 'row', alignItems: 'center', cursor: 'pointer',
      borderRadius: '3px', border: '1px solid #ccc', '&:hover': { borderColor: '#000' },
    }} onClick={()=>!isDeleted && navigate(`/chat/${session.id}`)}>
    {/* <IconButton size="small">{props.icon}</IconButton> */}
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch', pl: 0.5 }}>
      <Typography variant="body2" sx={isDeleted?{textDecoration: "line-through"}:{}} >{session.name}</Typography>
      <Stack direction="row" display={'flex'} justifyContent="end" alignItems={'flex-end'} spacing={1} sx={{ width: '100%' }}>
        <Typography variant="caption" sx={{ flexGrow: 1, color: 'text.secondary' }}>{formatDistanceToNow(parseJSON(session.updatedAt), { addSuffix: true })}</Typography>
        <IconButton aria-label="toggle favourite" size="small" disabled={isDeleted}>
          {session.type === 'f' ? <FavoriteIcon fontSize="inherit" color="secondary" /> : <FavoriteBorderIcon fontSize="inherit" />}
        </IconButton>
        <IconButton aria-label="toggle sharing" size="small" onClick={toggleSharing} disabled={isDeleted}>
          {session.type === 'public' ? <ShareIcon fontSize="inherit" color="success" /> : <ShareIcon fontSize="inherit" />}
        </IconButton>
        <IconButton aria-label="delete session" size="small" onClick={deleteSession} disabled={isDeleted}>
          <DeleteIcon fontSize="inherit" />
        </IconButton>
      </Stack>
    </Box>
  </Box>;
}

export default function ChatSessionList(props: ChatSessionListProps) {
  const {type, icon} = props;
  const navigate = useNavigate();
  const axios = useAxiosPrivate();
  const {data:sessions} = useChatHistory();

  return <List>
    {sessions?.map((session, index)=>{
      return <div key={session.id} >
      <ListItemButton onClick={()=>navigate(`/chat/${session.id}`)} alignItems="flex-start" dense >
        <ListItemAvatar>
          {icon ? icon : <Avatar alt="User Avatar">U</Avatar>}
        </ListItemAvatar>
        <ListItemText
          primary={session.name}
          secondary={
            <React.Fragment>
              {/* <Typography
                sx={{ display: 'inline' }}
                component="span"
                variant="body2"
                color="text.primary"
              ></Typography> */}
              {formatDistanceToNow(parseJSON(session.updatedAt),{addSuffix:true})}
            </React.Fragment>
          }
        />
      </ListItemButton>
      <Divider variant="inset" />
    </div>;
    })}
  </List>
}

export function ChatSessionList1(props: ChatSessionListProps) {
  const {auth, setAuth} = useAuth();
  const {type, icon} = props;
  const navigate = useNavigate();
  const axios = useAxiosPrivate();
  //const chatSessions = useChatHistory();

  // Are there more items to load?
  // (This information comes from the most recent API request.)
  const [hasNextPage, setHasNextPage] = useState(true);

  // Are we currently loading a page of items?
  const [isNextPageLoading, setIsNextPageLoading] = useState(false);

  // Array of items loaded so far.
  const [items, setItems] = useState<IChatSession[]>([]);

  // Callback function responsible for loading the next page of items.
  const loadNextPage = useCallback((offset:number, limit:number)=>{
    if (!(auth?.user)) return;
    limit = limit===0?10:limit;
    if (isNextPageLoading) return;
    // console.log(offset, limit);
    setIsNextPageLoading(true);
    axios.get(`/api/chat/history?type=${type}&offset=${offset}&limit=${limit}`)
      .then((res)=>{
        if (!(res?.data?.data)) return;
        const newItems = res.data.data as IChatSession[]
        if (newItems && newItems.length>0) {
          setItems(items=>([...items, ...newItems]));
          setHasNextPage(newItems.length === limit);
          // console.log(`got ${newItems.length} items`)
        } else {
          setHasNextPage(false);
        }
      })
      .catch(err=>{
        const ar = err as AxiosError;
        console.log(ar);
        if (ar) {
          if ((ar.response?.status||500)>= 500) {
            return; // try again
          }
        }
      })
      .finally(()=>{
        setIsNextPageLoading(false);
      })
  },[auth?.user, isNextPageLoading, axios, type, setAuth]);

  // If there are more items to be loaded then add an extra row to hold a loading indicator.
  const itemCount = hasNextPage ? items.length + 1 : items.length;

  // Only load 1 page of items at a time.
  // Pass an empty callback to InfiniteLoader in case it asks us to load more than once.
  const loadMoreItems = useMemo(()=>(isNextPageLoading ? () => {} : loadNextPage), [isNextPageLoading, loadNextPage]);

  // Every row is loaded except for our loading indicator row.
  const isItemLoaded = useCallback((index: number) => (!hasNextPage || index < items.length),[hasNextPage, items.length]);

  // Render an item or a loading indicator.
  const Item = (props:{ index:number, style:any }) => {
    if (!isItemLoaded(props.index)) {
      return <div style={props.style}>{""}</div>;
    }
    const session = items[props.index];

    return <div style={props.style}>
      <ListItemButton onClick={()=>navigate(`/chat/${session.id}`)} alignItems="flex-start" dense >
        <ListItemAvatar>
          {icon ? icon : <Avatar alt="User Avatar">U</Avatar>}
        </ListItemAvatar>
        <ListItemText
          primary={session.name}
          secondary={
            <React.Fragment>
              {/* <Typography
                sx={{ display: 'inline' }}
                component="span"
                variant="body2"
                color="text.primary"
              ></Typography> */}
              {formatDistanceToNow(parseJSON(session.updatedAt),{addSuffix:true})}
            </React.Fragment>
          }
        />
      </ListItemButton>
      <Divider variant="inset" />
    </div>;
  };

  return (<>
    {(items.length===0 && !isNextPageLoading) ? <Button size='small' color='inherit' onClick={()=>loadNextPage(0,0)} fullWidth>Load Chat History</Button> : null}
    {auth.user && <InfiniteLoader
      isItemLoaded={isItemLoaded}
      itemCount={itemCount}
      loadMoreItems={loadMoreItems}
    >
      {({ onItemsRendered, ref }) => (
        <FixedSizeList
          height={400}
          itemCount={itemCount}
          itemSize={72}
          onItemsRendered={onItemsRendered}
          ref={ref}
          width={'100%'}
        >
          {Item}
        </FixedSizeList>
      )}
    </InfiniteLoader>}
    </>
  );
}
