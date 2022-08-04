import { Typography } from '@mui/material';
import styles from './teams.module.scss';

/* eslint-disable-next-line */
export interface TeamsProps {}

export function Teams(props: TeamsProps) {
  return (
    <div className={styles['container']}>
      <Typography variant='h2'>Teams</Typography>
      <hr/>
    </div>
  );
}

export default Teams;
