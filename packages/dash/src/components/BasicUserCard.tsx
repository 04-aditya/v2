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
import { Row } from './Row';

export type BasicUserCardProps = CardProps & {
  user?:IUser
}

const BasicUserCard = (props:BasicUserCardProps)=>{
  const u=props.user;
  return <Card>
    <CardHeader
      avatar={
        u?<Avatar sx={{ bgcolor: 'secondary.main'}} aria-label="profile image" variant='rounded'>
          {(u.first_name||u.email)[0].toUpperCase()}
        </Avatar>:<Skeleton variant='rectangular' width={40} height={40}/>
      }
      action={
        <IconButton aria-label="settings">
          <MoreVertIcon/>
        </IconButton>
      }
      title={u?<Row><span>{u.first_name}&nbsp;{u.last_name}</span><IconButton size="small" aria-label='email' LinkComponent='a' href={`mailto:${u.email}`} ><EmailIcon fontSize='small' /></IconButton></Row>:<Skeleton variant='text' width={'36ch'} height='24'/>}
      subheader={<Row spacing={1}>
        {u?<Avatar alt="cabability" sx={{width: 16, height: 16 , fontSize:12}}>E</Avatar>:<Skeleton variant='circular' width={16} height={16}/>}
        {u?<span>Primary Role</span>:<Skeleton variant='text' width='16ch'/>}
        <SchoolIcon sx={{width:16, height:16}}/>
      </Row>}
    />
  </Card>
}

export default BasicUserCard;
