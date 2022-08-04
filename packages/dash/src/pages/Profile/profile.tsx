import { Typography } from '@mui/material';
import styles from './profile.module.scss';

/* eslint-disable-next-line */
export interface ProfileProps {}

export function Profile(props: ProfileProps) {
  return (
    <div className={styles['container']}>
      <Typography variant='h2'>Profile</Typography>
      <hr/>
    </div>
  );
}

export default Profile;
