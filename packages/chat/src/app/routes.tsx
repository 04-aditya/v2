import * as React from 'react';
import AppLayout from './applayout';
import Typography from "@mui/material/Typography";

const Unauthorized = ()=>(
  <div>
    <Typography variant='h2' color='error'>Unauthorized!</Typography>
  </div>
)

const PageLoadingPlaceholder = ()=>(
  <div>
    <Typography variant='h6' color='info'>Loading....</Typography>
  </div>
)

export type RouteMap = {
  path?: string,
  element?: JSX.Element,
  routes?: Array<RouteMap>,
  roles?:Array<string>,
  index?:boolean
}

const Login = React.lazy(() => import("../pages/login-page/login-page"));
const LoginPage = ()=><React.Suspense fallback={<PageLoadingPlaceholder/>}><Login/></React.Suspense>

const Home = React.lazy(() => import("../pages/home-page/home-page"));
const HomePage = ()=><React.Suspense fallback={<PageLoadingPlaceholder/>}><Home/></React.Suspense>

const routeMap:RouteMap = {
  path: '/',
  element:<AppLayout/>,
  routes: [
    {
      roles:[],
      routes:[
        {path:'/login', element:<LoginPage/>,},
        {path:'/unauthorized', element:<Unauthorized/>}
      ]
    },
    {
      roles:['default'],
      routes:[
        {index:true, path:'/', element:<HomePage/>},
        // {path:'/profile/:userId', element:<ProfilePage/>},
      ],
    },
  ],
};
export default routeMap;
