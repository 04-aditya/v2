import React from 'react';
import { IUser } from 'sharedtypes';
import Avatar from '@mui/material/Avatar';
import Card, { CardProps } from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Stack from '@mui/material/Stack';
import SchoolIcon from '@mui/icons-material/School';
import Skeleton from '@mui/material/Skeleton';
import EmailIcon from '@mui/icons-material/Email';

export type BasicUserCardProps = CardProps & {
  user?:IUser
}

const BasicUserCard = (props:BasicUserCardProps)=>{
  const u=props.user;
  return <Card>
    <CardHeader
      avatar={
        u?<Avatar sx={{ bgcolor: 'secondary.main'}} aria-label="profile image" variant='rounded'>
          R
        </Avatar>:<Skeleton variant='rectangular' width={40} height={40}/>
      }
      action={
        <IconButton aria-label="settings">
          <MoreVertIcon/>
        </IconButton>
      }
      title={u?<Stack direction='row' alignItems='center'><span>name</span><IconButton size="small" aria-label='email' LinkComponent='a' href={`mailto:${u.email}`} ><EmailIcon fontSize='small' /></IconButton></Stack>:<Skeleton variant='text' width={'36ch'} height='24'/>}
      subheader={<Stack direction='row' alignItems='center' spacing={1}>
        {u?<Avatar alt="cabability" sx={{bgcolor:'info.main', width: 16, height: 16 , fontSize:12}}>E</Avatar>:<Skeleton variant='circular' width={16} height={16}/>}
        {u?<span>Primary Role</span>:<Skeleton variant='text' width='16ch'/>}
        <SchoolIcon sx={{width:16, height:16}}/>
      </Stack>}
    />
  </Card>
}

export default BasicUserCard;
