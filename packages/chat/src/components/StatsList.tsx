/* eslint-disable @typescript-eslint/no-empty-function */
import React, { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import useAxiosPrivate from "psnapi/useAxiosPrivate";
import { Avatar, Box, Button, Chip, Divider, List, ListItem, ListItemAvatar, ListItemButton, ListItemText, ListSubheader, SxProps, Typography } from "@mui/material";
import { formatDistanceToNow, parseJSON } from "date-fns";
import { useNavigate } from "react-router-dom";
import PersonIcon from '@mui/icons-material/Person';
import { useChatStats } from "../api/chat";
import AccountCircle from '@mui/icons-material/AccountCircle';
import { UserAvatar } from "./UserAvatar";


// export function UserAvatar(props: {id: string | number, sx?: SxProps}) {
//   const axios = useAxiosPrivate();
//   const [photo, setPhoto] = useState<string|undefined>(undefined);
//   useEffect(()=>{
//     axios.get(`/api/users/${props.id}/photo`)
//       .then(res=>{
//         console.log(res.data);
//         setPhoto(res.data);
//       })
//       .catch(ex=>{
//         console.error(ex);
//       })
//   }, [props.id, axios]);
//   if (photo) {
//     return <Avatar src={photo} alt={`user(${props.id}) photo`} sx={props.sx || {width:32, height:32}}/>;
//   }
//   return <Box sx={props.sx}>
//     <AccountCircle color='inherit'/>
//   </Box>;
// }
export class ChatStatsListProps {
  type?: string = 'user';
  icon?: ReactNode = <PersonIcon/>;
}

export default function ChatStatsList(props: ChatStatsListProps) {
  const {type, icon} = props;
  const {data: items} = useChatStats(type,0,20);

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
              <UserAvatar id={item.userid}/>
              {/* <Chip variant="outlined" color="secondary" size="small" label={item.count+''} sx={{fontSize:"0.5em"}}/> */}
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
                  &nbsp;{'sessions:'}
                  <Typography
                    sx={{ display: 'inline' }}
                    component="span"
                    variant="body2"
                    color="text.primary"
                  >{item.count}</Typography>

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
