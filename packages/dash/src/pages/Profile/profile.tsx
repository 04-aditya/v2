import { useEffect, useState } from 'react';
import { IUser } from '@/../../shared/types/src';
import BasicUserCard from '@/components/BasicUserCard';
import { Box, Typography } from '@mui/material';
import styles from './profile.module.scss';
import useAxiosPrivate from '@/hooks/useAxiosPrivate';
import { appstateDispatch } from '@/hooks/useAppState';
import { useUser } from '@/api/users';
import { useParams } from 'react-router-dom';

/* eslint-disable-next-line */
export interface ProfileProps {}

export function Profile(props: ProfileProps) {
  const { userId } = useParams();
  const {data:user} = useUser(userId)
  useEffect(() => {
    appstateDispatch({type:'title', data:'Profile - PSNext'});
  }, []);

  return (
    <Box sx={{p:1}}>
      <BasicUserCard user={user}/>
      <hr/>
    </Box>
  );
}

export default Profile;
