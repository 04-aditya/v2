import * as React from 'react';
import { Box, Stack, Tab, Tabs } from '@mui/material';
import { Link, Outlet, useNavigate } from 'react-router-dom';

/* eslint-disable-next-line */
export interface AdminLayoutProps {}

export function AdminLayout(props: AdminLayoutProps) {
  const options=[
    {path: '/admin/users', label:'Users'},
    {path: '/admin/roles', label:'Roles'},
    {path: '/admin/permissions', label:'Permissions'},
    {path: '/admin/industries', label:'Industries'},
    {path: '/admin/clients', label:'Clients'},
    {path: '/admin/capabilities', label:'Capabilities'},
    {path: '/admin/crafts', label:'Crafts'},
    {path: '/admin/config', label:'Config'},
    {path: '/admin/stats', label:'Stats'},
    {path: '/admin/fields', label:'Fields'},
    {path: '/admin/cache', label:'Cache'},

  ];
  const navigate = useNavigate();
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
    navigate(options[newValue].path);
  };

  return (
    <Box sx={{width:'100%'}}>
      <Tabs
        value={value}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="administration pages"
      >
        {options.map((option, index) => <Tab key={index} value={index} label={option.label} />)}
      </Tabs>
      <Outlet/>
    </Box>
  );
}

export default AdminLayout;
