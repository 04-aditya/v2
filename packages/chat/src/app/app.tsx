import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import styles from './app.module.css';
//import { ThemeProvider,} from '@mui/material/styles';
import { ThemeProvider } from '@emotion/react';
import CssBaseline from '@mui/material/CssBaseline';
import {useTheme, ColorModeContext} from 'sharedui/theme';
import { Route, Routes } from 'react-router-dom';
import RequireAuth from 'psnapi/RequireAuth';
import { AuthProvider, IAuth } from 'psnapi/context/AuthProvider';
import routemap, { RouteMap } from './routes';
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import "intro.js/introjs.css";
import useAuth from 'psnapi/useAuth';

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
  const {colorMode} = useTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <ColorModeContext.Provider value={colorMode}>
        <AuthProvider>
          <AppRouter/>
        </AuthProvider>
      </ColorModeContext.Provider>
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}

export default App;
function AppRouter() {
  return <Routes>
    {generateRoute(routemap, 1)}
  </Routes>;
}

