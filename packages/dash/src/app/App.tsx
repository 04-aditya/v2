import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import styles from './App.module.scss';

import { Route, Routes, Link } from 'react-router-dom';
import Dashboard from '../pages/Dashboard/dashboard';
import AppLayout from './AppLayout';
import { Typography } from '@mui/material';
import Login from '../pages/Login/login';
import Profile from '../pages/Profile/profile';
import Teams from '../pages/Teams/teams';
import RequireAuth from '../components/RequireAuth';
import { AuthProvider } from '@/context/AuthProvider';
export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/"
          element={<AppLayout/>}
        >
          <Route path='/login' element={<Login/>}/>
          <Route path='/unauthorized' element={
            <div>
              <Typography variant='h2' color='error'>Unauthorized!</Typography>
            </div>
          }/>
          <Route element={<RequireAuth allowedRoles={['default']} />}>
            <Route index element={<Dashboard/>}/>
            <Route path="/profile" element={<Profile/>}/>
            <Route path="/teams" element={<Teams/>}/>
          </Route>
        </Route>
      </Routes>
      {/* END: routes */}
    </AuthProvider>
  );
}

export default App;
