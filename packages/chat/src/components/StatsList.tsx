/* eslint-disable @typescript-eslint/no-empty-function */
import React, { ReactNode, useCallback, useMemo, useState } from "react";
import useAxiosPrivate from "psnapi/useAxiosPrivate";
import { Avatar, Button, Chip, Divider, List, ListItem, ListItemAvatar, ListItemButton, ListItemText, ListSubheader, Typography } from "@mui/material";
import { formatDistanceToNow, parseJSON } from "date-fns";
import { useNavigate } from "react-router-dom";
import PersonIcon from '@mui/icons-material/Person';
import { useChatStats } from "../api/chat";

export class ChatStatsListProps {
  type?: string = 'user';
  icon?: ReactNode = <PersonIcon/>;
}

export default function ChatStatsList(props: ChatStatsListProps) {
  const {type, icon} = props;
  const {data: items} = useChatStats(type);

  //const chatSessions = useChatHistory();
  // Render an item or a loading indicator.
  return (<div style={{textOverflow:'clip', overflow:'hidden', width:'100%'}}>
    <List
      sx={{
        width: '100%',
        maxWidth: 360,
        bgcolor: 'background.paper',
        position: 'relative',
        overflowX: 'hidden',
        overflowY: 'auto',
        maxHeight: 300,
        '& ul': { padding: 0 },
      }}
      subheader={<li />}
    >
      <ul>
        <ListSubheader>Top users</ListSubheader>
        {items?.map((item: any, i: number)=><div key={i}>
          <ListItemButton alignItems="flex-start" dense >
            <ListItemAvatar>
              <Chip variant="outlined" color="secondary" size="small" label={item.count+''} sx={{fontSize:"0.5em"}}/>
            </ListItemAvatar>
            <ListItemText
              primary={<a href={`mailto:${item.userid}`} target="_blank" rel="noreferrer">{item.userid}</a>}
              secondary={
                <React.Fragment>
                  {'tokens:'}
                  <Typography
                    sx={{ display: 'inline' }}
                    component="span"
                    variant="body2"
                    color="text.primary"
                  >{Math.round(item.total_tokens/10)/100}<small>K</small></Typography>

                  {/* {formatDistanceToNow(parseJSON(session.updatedAt),{addSuffix:true})} */}
                </React.Fragment>
              }
            />
          </ListItemButton>
          <Divider variant="inset" />
        </div>)}
      </ul>
    </List>
    </div>
  );
}
