import React from "react";
import { Avatar, Box, SxProps } from "@mui/material";
import { useUser } from 'psnapi/users';
import AccountCircle from '@mui/icons-material/AccountCircle';

export function UserAvatar(props: { id?: string | number; sx?: SxProps}) {
  const { data: user } = useUser(props.id);
  if (user) {
    return <Avatar alt={user.email} src={user.photo} sx={props.sx || {width:32, height:32}}/>;
  }
  return <Box sx={{...props.sx, display: 'inline'}}> <AccountCircle color='inherit'/></Box>;
}
