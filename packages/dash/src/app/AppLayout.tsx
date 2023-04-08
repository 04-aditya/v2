import React, { useEffect, useMemo } from 'react';
import { Link, Outlet } from 'react-router-dom';

import { styled, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import MuiDrawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import MuiAppBar, { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Badge from '@mui/material/Badge';
import List from '@mui/material/List';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import NotificationsIcon from '@mui/icons-material/Notifications';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import ExtensionIcon from '@mui/icons-material/Extension';
import GroupIcon from '@mui/icons-material/Group';
import GroupsIcon from '@mui/icons-material/Groups';
import Divider from '@mui/material/Divider';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { theme } from './theme';
import {notificationDispatch, useNotificationStore} from '@/hooks/useNotificationState';
import {useAppStore} from 'sharedui/hooks/useAppState';
import { CircularProgress, ListItem, ListItemAvatar, Menu, MenuItem, useTheme } from '@mui/material';
import QueryBuilderIcon from '@mui/icons-material/QueryBuilder';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import useAuth from 'psnapi/useAuth';
import logo4light from 'sharedui/assets/PS_Logo_RGB_light.png';

interface AppBarProps extends MuiAppBarProps {
  open?: boolean;
}

const drawerWidth = 240;

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<AppBarProps>(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  background: theme.palette.background.paper,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    // marginLeft: drawerWidth,
    // width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    '& .MuiDrawer-paper': {
      position: 'relative',
      whiteSpace: 'nowrap',
      width: drawerWidth,
      borderWidth:0,
      background: theme.palette.background.default,
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
      boxSizing: 'border-box',
      ...(!open && {
        overflowX: 'hidden',
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
        width: theme.spacing(7),
        [theme.breakpoints.up('sm')]: {
          width: theme.spacing(9),
        },
      }),
    },
  }),
);

const AppLayout = ()=>{

  const [open, setOpen] = React.useState(false);
  const toggleDrawer = () => setOpen(!open);
  const {auth}= useAuth();

  const isAdmin = useMemo(()=>{
    return auth.user?auth.user.roles.find((r:any)=>r.name==='admin'):false;
  }, [auth.user]);

  return <ThemeProvider theme={theme}>
  <CssBaseline />

  <AppBar position="absolute" open={open} elevation={0}>
    <Toolbar
      sx={{//ml:(open?-2:7), pr: '24px', // keep right padding when drawer closed
      }}
    >
      {/* <IconButton
        edge="start"
        color="inherit"
        aria-label="open drawer"
        onClick={toggleDrawer}
        sx={{
          marginRight: '36px',
          ...(open && { display: 'none' }),
        }}
      >
        <MenuIcon />
      </IconButton> */}
      <Box sx={{pr:2, pt:1}}>
        <img src={logo4light} height={'32px'} alt='publicis sapient logo'/>
      </Box>
      <Title/>
      <NotificationIcon/>
    </Toolbar>
  </AppBar>
  <div id='content'>
    <Drawer variant="permanent" open={open} onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)}>
      <AppBar position='static' elevation={0}>
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          px: [1],
        }}
      >
        {open?<IconButton onClick={toggleDrawer} color="inherit">
          <ChevronLeftIcon />
        </IconButton>:null}
      </Toolbar>
      </AppBar>
      <DrawerMenu isAdmin={isAdmin}/>
    </Drawer>
    <section id='contentbody'>
      <Toolbar/>
      <Outlet/>
    </section>
  </div>
  <footer><Typography variant='subtitle2' sx={{color:'#555'}}>Built on <em>{process.env['NX_BUILD_DATE']}</em>&nbsp; &nbsp; Version: <em>{process.env['NX_BUILD_VERSION']}</em></Typography> </footer>
  </ThemeProvider>
}

function Title() {
  const theme = useTheme();
  const title = useAppStore('title');
  return <Typography
    component="h1"
    variant="h6"
    color={theme.palette.primary.dark}
    noWrap
    sx={{ flexGrow: 1 }}
  >
    {title}
  </Typography>;
}

function NotificationIcon() {
  const unreadCount = useNotificationStore('unreadCount');
  const notifications = useNotificationStore('notifications');
  const busy = useNotificationStore('busy');
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    notificationDispatch({type: 'resetunreadcount'})
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return <React.Fragment>
    <IconButton color="inherit" onClick={handleClick}
      aria-controls={open ? 'notifications-menu' : undefined}
      aria-haspopup="true"
      aria-expanded={open ? 'true' : undefined}
    >
      <Badge badgeContent={unreadCount} color="secondary">
        {busy?<CircularProgress sx={{
                position:'absolute',
                top: -8,
                left: -8,
                zIndex: 1
            }}/>:null}
        <NotificationsIcon color="inherit"/>
      </Badge>
    </IconButton>
    <Menu
      anchorEl={anchorEl}
      id="notifications-menu"
      open={open}
      onClose={handleClose}
      onClick={handleClose}
      PaperProps={{
        elevation: 0,
        sx: {
          maxWidth: 400,
          overflow: 'visible',
          filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
          mt: 1.5,
          '& .MuiAvatar-root': {
            width: 32,
            height: 32,
            ml: -0.5,
            mr: 1,
          },
          '&:before': {
            content: '""',
            display: 'block',
            position: 'absolute',
            top: 0,
            right: 14,
            width: 10,
            height: 10,
            bgcolor: 'background.paper',
            transform: 'translateY(-50%) rotate(45deg)',
            zIndex: 0,
          },
        },
      }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    >
      {notifications.map(n=>{
        return <ListItem key={n.id} dense>
          <ListItemAvatar>
            {n.status==='error'?<ErrorOutlineIcon color='error'/>:(
              n.status==='done'?<TaskAltIcon color='success'/>:<QueryBuilderIcon color='info'/>
            )}
          </ListItemAvatar>
          <ListItemText primary={n.title} secondary={n.description}/>
        </ListItem>
      })}
      {notifications.length===0?<ListItem key={'empty'} dense>
        <ListItemText primary={''} secondary={'no notifications'}/>
      </ListItem>:null}
    </Menu>
  </React.Fragment>;
}

function DrawerMenu(props:any) {
  return <List component="nav">
  <MenuEntry path="/" text="Home" icon={<HomeIcon />}/>
  <MenuEntry path="/dashboard/me" text="Dashboard" icon={<DashboardIcon />}/>
  <MenuEntry path="/profile/me" text="Profile" icon={<PersonIcon />}/>
  <MenuEntry path="/teams/me" text="Teams" icon={<GroupsIcon/>}/>
  <MenuEntry path="/developer" text="Developer Settings" icon={<ExtensionIcon />}/>
  <Divider/>
  {props.isAdmin?<MenuEntry path="/admin" text="Admin" icon={<AdminPanelSettingsIcon/>}/>:null}
</List>
}
function MenuEntry({path, text, icon}:{path:string, text:string, icon:React.ReactNode}) {
  return <ListItemButton component={Link} to={path}>
    <ListItemIcon sx={{ color: "inherit" }}>
      {icon}
    </ListItemIcon>
    <ListItemText primary={text} />
  </ListItemButton>;
}
export default AppLayout;

