import { Paper, Divider, Typography, Skeleton } from '@mui/material';
import styles from './privacy-page.module.css';

/* eslint-disable-next-line */
export interface PrivacyPageProps {}

export function PrivacyPage(props: PrivacyPageProps) {
  return (
    <Paper elevation={2}
      sx={{display:'flex', height:'100%', flexDirection:'column', p:{xs:0, sm:1},}}>
      <h3>Privacy standards for PS Chat application</h3>
      <Divider/>
      <br/>
      <Typography variant='body2'>
        This is a privacy policy for PS Chat application. TBD...
      </Typography>
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
    </Paper>
  );
}

export default PrivacyPage;
