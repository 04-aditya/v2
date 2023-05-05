/* eslint-disable @typescript-eslint/no-empty-function */
import React, { ReactNode, SyntheticEvent, useCallback, useEffect, useMemo, useState } from "react";
import { FixedSizeList, ListChildComponentProps } from "react-window";
import InfiniteLoader from "react-window-infinite-loader";
import { useChatHistory, useChatModels, useChatSession, useChatSessionFavourite } from "../api/chat";
import { IChatSession } from "sharedtypes";
import useAxiosPrivate from "psnapi/useAxiosPrivate";
import { Alert, Avatar, Box, Button, Divider, Fade, LinearProgress, List, ListItem, ListItemAvatar, ListItemButton, ListItemText, Paper, Stack, Tooltip, Typography } from "@mui/material";
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
import { UserAvatar } from "./UserAvatar";
export class ChatSessionListProps {
  type?: string = 'private';
  icon?: ReactNode = <ForumIcon/>;
  userid?: string;
  show?:string;
}

export function ChatSessions(props: ChatSessionListProps) {
  const {data:models} = useChatModels(); // preload
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  // Array of items loaded so far.
  const [items, setItems] = useState<{id:string}[]>([]);
  const fetchChatSessions = useMemo(()=>(async ({ pageParam = 0 }) => {
      const res = await axios(`/api/chat/history?limit=10&offset=${pageParam*10}&type=${props.type}`);
      return res.data.data;
    }
  ),[axios, props.type]);
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ['chathistory', props.type],
    queryFn: fetchChatSessions,
    getNextPageParam: (lastPage, pages) =>{
      if (lastPage.length < 5) return undefined;
      return pages.length;
    }
  })

  useEffect(()=>{
    const newItems: {id:string}[] = [];
    data?.pages.forEach((group)=>{ group.forEach((item:{id:string})=>{newItems.push(item)})});
    setItems(newItems);
  },[data])


  // If there are more items to be loaded then add an extra row to hold a loading indicator.
  const itemCount = hasNextPage ? items.length + 1 : items.length;

  // Only load 1 page of items at a time.
  // Pass an empty callback to InfiniteLoader in case it asks us to load more than once.
  const loadMoreItems:any = useMemo(()=>(isFetchingNextPage ? () => {} : fetchNextPage), [isFetchingNextPage, fetchNextPage]);

  // Every row is loaded except for our loading indicator row.
  const isItemLoaded = useCallback((index: number) => (!hasNextPage || index < items.length),[hasNextPage, items.length]);

  return status === 'loading' ? (
    <p>Loading...</p>
  ) : error ? (
    <Alert severity="error">Unable to load the chat sessions.</Alert>
  ) : (
    <Box sx={{display:'flex', flexDirection:'column'}} className="scrollbarv">
      {items.map((session:{id:string},i: number) => (
        <SessionSummary key={session.id} sessionid={session.id} show={props.show} onDelete={()=>queryClient.invalidateQueries({ queryKey: ['chathistory'] })}/>
      ))}
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
    </Box>
  )
}

export function SessionSummary(props: {show?: string, sessionid?: string, session?:IChatSession, onDelete?: ()=>void}) {
  const axios = useAxiosPrivate();
  const {data: session,mutation, error, isLoading, invalidateCache} = useChatSession(props.sessionid);
  const [isDeleted, setIsDeleted] = useState(false);
  const {data:isFavourite, mutation:favMutation, invalidateCache: favInvalidateCache} = useChatSessionFavourite(session?.id);
  const navigate = useNavigate();

  const deleteSession = useCallback((e: SyntheticEvent) => {
    e.stopPropagation();
    if (!session || isDeleted) return;
    axios.delete(`/api/chat/${session?.id}`)
    .then(() => {
      setIsDeleted(true);
      // if (props.onDelete) props.onDelete();
    })
    .catch((err)=>console.error(err))
  },[axios, isDeleted, session]);

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
    e.stopPropagation();
    if (!session) return;
    axios.post(`/api/chat/${session.id}/sharing`,{
      type: session.type==='public'?'private':'public'
    })
    .then(() => {
      invalidateCache();
    })
    .catch((err)=>console.error(err));

    return true;
    // mutation.mutateAsync({
    //   id: session?.id,
    //   type: session?.type==='public'?'private':'public'
    // })
    // .then((data) => {
    //   invalidateCache();
    // })
    // .catch((err)=>console.error(err))
  },[axios, session?.id, session?.type, invalidateCache]);

  if (isLoading) return <LinearProgress/>;
  if (!session) return <Typography variant="body2">?</Typography>;
  return <Fade in timeout={500}><Box sx={theme=>({
      mb: 1, p: 0.5, minHeight: 72, display: 'flex', flexDirection: 'row', alignItems: 'flex-start', cursor: 'pointer',
      borderRadius: '3px', border: `1px solid #ccc`, borderColor:theme.palette.divider, '&:hover': { borderColor: theme.palette.action.active },
    })} onClick={()=>{
      !isDeleted && navigate(`/chat/${session.id}`)
    }}>
    {/* <IconButton size="small">{props.icon}</IconButton> */}
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch', pl: 0.5 }}>
      <Box sx={{ width: '100%', display:'flex', flexDirection: 'row', justifyContent: 'flex-start', flexGrow: 1 }}>
        {(props.show||'').indexOf('user')!==-1? <UserAvatar
          id={session.userid} sx={{display:'block', flexShrink:1, width:24, height:24, mr:0.5}}/>:null}
        <Typography variant="body2" component={"span"} sx={isDeleted?{textDecoration: "line-through"}:{flexGrow: 1}} >
          {session.name}
        </Typography>
      </Box>
      <Stack direction="row" display={'flex'} justifyContent="end" alignItems={'flex-end'} spacing={1} sx={{ width: '100%' }}>
        <Typography variant="caption" sx={{ flexGrow: 1, color: 'text.secondary' }}>{formatDistanceToNow(parseJSON(session.updatedAt), { addSuffix: true })}</Typography>
        <IconButton aria-label="toggle favourite" size="small" onClick={toggleFavourite} disabled={isDeleted}>
          {isFavourite ? <FavoriteIcon fontSize="inherit" color="secondary" /> : <FavoriteBorderIcon fontSize="inherit" />}
        </IconButton>
        <IconButton aria-label="toggle sharing" size="small" onClick={toggleSharing} disabled={isDeleted}>
          {session.type === 'public' ? <ShareIcon fontSize="inherit" color="info" /> : <ShareIcon fontSize="inherit" />}
        </IconButton>
        <IconButton aria-label="delete session" size="small" onClick={deleteSession} disabled={isDeleted}>
          <DeleteIcon fontSize="inherit" />
        </IconButton>
      </Stack>
    </Box>
  </Box></Fade>;
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
