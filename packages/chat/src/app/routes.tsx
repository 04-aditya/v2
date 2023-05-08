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

const ChatSession = React.lazy(() => import("../pages/chat-session-page/chat-session-page"));
const ChatSessionPage = ()=><React.Suspense fallback={<PageLoadingPlaceholder/>}><ChatSession/></React.Suspense>

const Releases = React.lazy(() => import("../pages/releases-page/releases-page"));
const ReleasesPage = ()=><React.Suspense fallback={<PageLoadingPlaceholder/>}><Releases/></React.Suspense>

const Terms = React.lazy(() => import("../pages/terms-page/terms-page"));
const TermsPage = ()=><React.Suspense fallback={<PageLoadingPlaceholder/>}><Terms/></React.Suspense>

const Privacy = React.lazy(() => import("../pages/privacy-page/privacy-page"));
const PrivacyPage = ()=><React.Suspense fallback={<PageLoadingPlaceholder/>}><Privacy/></React.Suspense>

const routeMap:RouteMap = {
  path: '/',
  element:<AppLayout/>,
  routes: [
    {
      roles:[],
      routes:[
        {path:'/login', element:<LoginPage/>,},
        {path:'/unauthorized', element:<Unauthorized/>},
        {path:'/terms', element:<TermsPage/>},
        {path:'/privacy', element:<PrivacyPage/>},
        {path:'/releases', element:<ReleasesPage/>},
      ]
    },
    {
      roles:['default'],
      routes:[
        {index:true, path:'/', element:<HomePage/>},
        {path:'/chat/:chatId', element:<ChatSessionPage/>},
      ],
    },
  ],
};
export default routeMap;
