import { useEffect } from 'react';
import { appstateDispatch } from 'sharedui/hooks/useAppState';
import { Typography } from '@mui/material';
import styles from './dashboard.module.scss';

/* eslint-disable-next-line */
export interface AdminDashboardProps {}

export function AdminDashboard(props: AdminDashboardProps) {
  useEffect(() => {
    appstateDispatch({type:'title', data:'Dashboard (Admin) - PSNext'});
  }, []);
  return (
    <div className={styles['container']}>
      <Typography variant='h5'>Admin Widgets</Typography>
    </div>
  );
}

export default AdminDashboard;
