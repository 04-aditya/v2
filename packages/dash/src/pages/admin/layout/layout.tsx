
import { Box, Stack } from '@mui/material';
import { Link, Outlet } from 'react-router-dom';

/* eslint-disable-next-line */
export interface AdminLayoutProps {}

export function AdminLayout(props: AdminLayoutProps) {
  return (
    <Box>
      <Stack direction={'row'} spacing={1} sx={{p:1}}>
        <Link to={'/admin/users'}>Users</Link>
        <Link to={'/admin/roles'}>Roles</Link>
        <Link to={'/admin/permissions'}>Permissions</Link>
      </Stack>
      <Outlet/>
    </Box>
  );
}

export default AdminLayout;
