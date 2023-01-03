import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import styles from './App.module.scss';

import { Route, Routes, Link, RouteMatch } from 'react-router-dom';
import AppLayout from './AppLayout';
import { Typography } from '@mui/material';
import RequireAuth from '../components/RequireAuth';
import { AuthProvider } from '@/context/AuthProvider';
import routemap, { RouteMap } from './Routes';
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const queryClient = new QueryClient();

function generateRoute(r:RouteMap, idx:number){
  let childRoutes=null;
  if (r.routes && r.routes.length) {
    const routes = r.routes.map((cr,i)=>generateRoute(cr,i))
    if (r.roles && r.roles.length) {
      childRoutes = <Route element={<RequireAuth allowedRoles={r.roles}/>}>
        {routes}
      </Route>
    } else childRoutes = routes;

  }
  if (r.index) {
    return <Route key={idx} path={r.path} element={r.element||null} index/>
  } else {
  return <Route key={idx} path={r.path} element={r.element} >
    {childRoutes}
  </Route>
  }
}
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Routes>
          {generateRoute(routemap,1)}
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
      </AuthProvider>
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}

export default App;
