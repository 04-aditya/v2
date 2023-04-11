import { Divider, Paper, Skeleton, Typography } from '@mui/material';
import styles from './terms-page.module.css';

/* eslint-disable-next-line */
export interface TermsPageProps {}

export function TermsPage(props: TermsPageProps) {
  return (
    <Paper elevation={2}
      sx={{display:'flex', height:'100%', flexDirection:'column', p:{xs:0, sm:1},}}>
      <h3>Terms & Conditions for PS Chat application</h3>
      <Divider/>
      <br/>
      TBD..
      <Skeleton width="100%" height={20} animation="wave"/>
      <Skeleton width="80%" height={20} animation="wave"/>
      <Skeleton width="90%" height={20} animation="wave"/>
      <Skeleton width="100%" height={20} animation="wave"/>
      <Skeleton width="80%" height={20} animation="wave"/>
      <Skeleton width="100%" height={20} animation="wave"/>
      <Skeleton width="80%" height={20} animation="wave"/>
      <Skeleton width="90%" height={20} animation="wave"/>
      <Skeleton width="100%" height={20} animation="wave"/>
      <Skeleton width="80%" height={20} animation="wave"/>
      <Skeleton width="90%" height={20} animation="wave"/>
      <Skeleton width="100%" height={20} animation="wave"/>
      <Skeleton width="80%" height={20} animation="wave"/>
      <Skeleton width="100%" height={20} animation="wave"/>
      <Skeleton width="80%" height={20} animation="wave"/>
      <Skeleton width="90%" height={20} animation="wave"/>
      <Skeleton width="80%" height={20} animation="wave"/>
      <Skeleton width="90%" height={20} animation="wave"/>
      <Skeleton width="100%" height={20} animation="wave"/>
      <Skeleton width="80%" height={20} animation="wave"/>
      <br/>
      <Typography variant='body2'>
        By accessing this website we assume you accept these terms and conditions in full.
        Do not continue to use PS Chat application's website if you do not accept all of the terms and conditions stated on this page.
      </Typography>
    </Paper>
  );
}

export default TermsPage;
