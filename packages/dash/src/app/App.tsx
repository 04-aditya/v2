import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import styles from './App.module.scss';

import { Route, Routes, Link, RouteMatch } from 'react-router-dom';
import AppLayout from './AppLayout';
import { Typography } from '@mui/material';
import RequireAuth from '../components/RequireAuth';
import { AuthProvider } from '@/context/AuthProvider';
import routemap, { RouteMap } from './Routes';

function generateRoute(r:RouteMap){
  let childRoutes=null;
  if (r.routes && r.routes.length) {
    const routes = r.routes.map(cr=>generateRoute(cr))
    if (r.roles && r.roles.length) {
      childRoutes = <Route element={<RequireAuth allowedRoles={r.roles}/>}>
        {routes}
      </Route>
    } else childRoutes = routes;

  }
  return <Route path={r.path} element={r.element} index={r.index}>
    {childRoutes}
  </Route>
}
export function App() {
  return (
    <AuthProvider>
      <Routes>
        {generateRoute(routemap)}
{/*
        <Route
          path="/"
          element={<AppLayout/>}
        >
          <Route path='/login' element={<Login/>}/>
          <Route element={<RequireAuth allowedRoles={['default']} />}>
            <Route index element={<Dashboard/>}/>
            <Route path="/profile" element={<Profile/>}/>
          </Route>
        </Route> */}
      </Routes>
      {/* END: routes */}
    </AuthProvider>
  );
}

export default App;
