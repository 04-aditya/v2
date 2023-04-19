/* eslint-disable @typescript-eslint/no-empty-function */
import React, { ReactNode, useCallback, useMemo, useState } from "react";
import { FixedSizeList as List } from "react-window";
import InfiniteLoader from "react-window-infinite-loader";
import { useChatHistory } from "../api/chat";
import { IChatSession } from "sharedtypes";
import useAxiosPrivate from "psnapi/useAxiosPrivate";
import { Avatar, Button, Divider, ListItem, ListItemAvatar, ListItemButton, ListItemText, Typography } from "@mui/material";
import { formatDistanceToNow, parseJSON } from "date-fns";
import { useNavigate } from "react-router-dom";
import ForumIcon from '@mui/icons-material/Forum';
import useAuth from "psnapi/useAuth";
import { AxiosError } from "axios";

export class ChatSessionListProps {
  type?: string = 'private';
  icon?: ReactNode = <ForumIcon/>;
  userid?: string;
}

export default function ChatSessionList(props: ChatSessionListProps) {
  const {auth, setAuth} = useAuth();
  const {type, icon} = props;
  const navigate = useNavigate();
  const axios = useAxiosPrivate();
  //const chatSessions = useChatHistory();

  // Are there more items to load?
  // (This information comes from the most recent API request.)
  const [hasNextPage, setHasNextPage] = useState((auth?.user)?true:false);

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
        } else {
          console.error(err);
        }
      })
      .finally(()=>{
        setIsNextPageLoading(false);
      })
  },[auth, axios, type, setAuth]);

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
        <List
          height={400}
          itemCount={itemCount}
          itemSize={72}
          onItemsRendered={onItemsRendered}
          ref={ref}
          width={'100%'}
        >
          {Item}
        </List>
      )}
    </InfiniteLoader>}
    </>
  );
}
