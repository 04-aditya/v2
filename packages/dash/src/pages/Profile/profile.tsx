import React, { useEffect, useState } from 'react';
import styles from './profile.module.scss';
import { IUser } from 'sharedtypes';
import BasicUserCard from '@/components/BasicUserCard';
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from '@mui/material';
import { appstateDispatch } from 'sharedui/hooks/useAppState';
import { useUser, useUserTeam } from 'psnapi/users';
import { useParams } from 'react-router-dom';
/* eslint-disable-next-line */
export interface ProfileProps {}

export function Profile(props: ProfileProps) {
  const { userId } = useParams();
  const {data:user} = useUser(userId);
  useEffect(() => {
    appstateDispatch({type:'title', data:'Profile - PSNext'});
  }, []);

  return (
    <Box sx={{p:1}}>
      <BasicUserCard user={user} options={['stats']}/>
      {/* <Accordion  elevation={0}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="stats-content"
          id="stats-header"
        >
          <Typography>Stats</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{bgcolor:'transparent'}}>
        </AccordionDetails>
      </Accordion> */}
    </Box>
  );
}

export default Profile;
