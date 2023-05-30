import React from "react";
import { AppBar, Box, Collapse, CssBaseline, Fade, Menu, MenuItem, Paper, Stack, TextField, ThemeProvider, Typography, alpha } from "@mui/material";
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuIcon from '@mui/icons-material/Menu';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import AddCommentIcon from '@mui/icons-material/AddComment';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

import Toolbar from '@mui/material/Toolbar';
import logo4dark from 'sharedui/assets/PS_Logo_RGB_dark.png';
import logo4light from 'sharedui/assets/PS_Logo_RGB_light.png';
import logo from '../assets/appicon.svg'
import { useTheme } from "sharedui/theme";
import { Outlet, useNavigate } from "react-router-dom";
import { useChatHistory } from "../api/chat";
import ForumIcon from '@mui/icons-material/Forum';
import AccountCircle from '@mui/icons-material/AccountCircle';
import InfoIcon from '@mui/icons-material/Info';
import HistoryIcon from '@mui/icons-material/History';
import FolderIcon from '@mui/icons-material/Folder';
import {formatDistanceToNow, parseJSON} from 'date-fns';
import useAuth from "psnapi/useAuth";
import ChatSessionList, { ChatSessions } from "../components/ChatSessionList";
import useAxiosPrivate from "psnapi/useAxiosPrivate";
import LogoutButton from "sharedui/components/LogoutButton";
import { AboutDialog } from "../components/AboutDialog";
import { UserAvatar } from "../components/UserAvatar";

const drawerWidth = 280;

interface Props {
  /**
   * Injected by the documentation to work in an iframe.
   * You won't need it on your project.
   */
  window?: () => Window;
}


const DrawerContent = (dprops: any)=>{
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(true);
  const [openHistory, setOpenHistory] = React.useState(false);

  const handleClick = () => {
    setOpen(!open);
  };
  if (!dprops.auth.user) {
    return <Box/>;
  }

  //if (dprops.onlyIcons) {
    return <Box sx={{display:'flex', flexDirection:'column', height:'100vh', alignContent:'center', justifyContent:'space-between', overflow:'hidden'}}>
      <Toolbar sx={{ml:-1.5, mb:3}}>
        <img src={logo} height={32} alt={`${process.env['NX_APP_NAME']} logo`} onClick={()=>navigate('/')}
        style={{cursor: 'pointer'}}/>
        {dprops.onlyIcons?null:<Typography variant="h6" noWrap component="div" sx={{ml:2, cursor: 'pointer'}}
          onClick={()=>navigate('/')}>
          {process.env['NX_APP_NAME']}
        </Typography>}
      </Toolbar>
      <Box>
        <ListItemButton sx={{maxHeight:'48px'}} onClick={()=>navigate('/')}>
          <ListItemIcon>
            <AddCommentIcon/>
          </ListItemIcon>
          {dprops.onlyIcons?null:<ListItemText>New Chat</ListItemText>}
        </ListItemButton>
        <ListItemButton sx={{maxHeight:'48px'}} onClick={()=>setOpenHistory(!openHistory)}>
          <ListItemIcon>
            <HistoryIcon/>
          </ListItemIcon>
          {dprops.onlyIcons?null:<ListItemText>Chat History</ListItemText>}
        </ListItemButton>
        <Collapse sx={{}} in={openHistory && !dprops.onlyIcons} timeout="auto">
          <Paper sx={
            theme=>( {height:'50vh',m:1, p:1, backgroundColor:alpha(theme.palette.background.paper,0.5) })
            } className="scrollbarv">
          {dprops.auth.user?<ChatSessions type='private' icon={<ForumIcon sx={{color:'#999'}}/>}/>:null}
          </Paper>
        </Collapse>
        <Divider/>
        <ListItem disablePadding>
          <ListItemButton onClick={()=>navigate('/files')}>
            <ListItemIcon>
              <FolderIcon/>
            </ListItemIcon>
            <ListItemText primary={'Files'} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={dprops.colorMode.toggleColorMode}>
            <ListItemIcon>
              {dprops.mode==='dark'?<LightModeIcon/>:<DarkModeIcon/>}
            </ListItemIcon>
            {dprops.onlyIcons?null:<ListItemText primary={dprops.mode==='dark' ? 'Light Mode' : 'Dark Mode'} />}
          </ListItemButton>
        </ListItem>
        <AboutDialog showText={!dprops.onlyIcons}/>
      </Box>
      <Box sx={{height:24}}/>
    </Box>
};

export default function AppLayout(props: Props) {
  const axios = useAxiosPrivate();
  const { auth, setAuth } = useAuth();
  const navigate = useNavigate();
  const {colorMode, mode, theme} = useTheme();
  const { window } = props;
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [isMouseOver, setIsMouseOver] = React.useState(false);

  const isProfileMenuOpen = Boolean(anchorEl);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const container = window !== undefined ? () => window().document.body : undefined;
  const menuId = 'primary-search-account-menu';
  const renderProfileMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      id={menuId}
      keepMounted
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={isProfileMenuOpen}
      onClose={handleMenuClose}
    >
      <MenuItem ><LogoutButton onClick={handleMenuClose}>Logout</LogoutButton></MenuItem>
    </Menu>
  );

  return <ThemeProvider theme={theme}>
    <CssBaseline/>
    <Box sx={{display:'flex', height:'100%'}}>
    <AppBar
      position="fixed"
      sx={{
        width: { sm: `calc(100% - ${drawerWidth}px)` },
        ml: { sm: `${drawerWidth}px` },
        backgroundColor: 'transparent',
      }}
      elevation={0}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ mr: 2, display: { sm: 'none' } }}
        >
          <img src={logo} alt='menu' height={24}/>
        </IconButton>
        <Typography variant="h6" noWrap component="div" sx={{display: { sm: 'none' }, cursor: 'pointer'}}>
          {process.env['NX_APP_NAME']}
        </Typography>
        <Box sx={{display:'flex', flexGrow:1, flexDirection:'row', justifyContent:'space-between'}}>
          <Box/>
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls={menuId}
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            {auth.user?<UserAvatar/>:<AccountCircle />}
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
    {renderProfileMenu}
    <Box
      component="nav"
      sx={{ width: { sm: isMouseOver ? drawerWidth : 32 }, overflow:'hidden', flexShrink: { sm: 0 } }}
      aria-label="chat options"
    >
      <Drawer
        container={container}
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, },
        }}
      >
        <DrawerContent auth={auth} colorMode={colorMode} mode={mode}/>
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            borderRadius:2, boxSizing: 'border-box', maxHeight:'calc(100% - 16px)',
            width: isMouseOver ? drawerWidth : 48,
            borderRight:'0px',overflowY:'hidden',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: isMouseOver ? theme.transitions.duration.leavingScreen : theme.transitions.duration.enteringScreen,
            }),
          },
        }}
        PaperProps={{
          sx:{backgroundColor:'transparent'}
        }}
        open
        onMouseEnter={()=>setIsMouseOver(true)}
        onMouseLeave={()=>setIsMouseOver(false)}
      >
          <DrawerContent auth={auth} onlyIcons={!isMouseOver} colorMode={colorMode} mode={mode}/>
      </Drawer>
    </Box>
    <Box
        component="main"
        sx={{ flexGrow: 1, p: 1, width: { sm: `calc(100% - ${drawerWidth}px)`, display:'flex',
        flexDirection:'column', height:'100%', overflow: 'hidden' } }}
      >
        <Toolbar />
        <Box sx={{display:'flex', flexGrow:1, flexDirection:'column',p:{xs:0, sm:1}, overflow: 'auto'}} >
          <Outlet/>
        </Box>
    </Box>
  </Box>
  </ThemeProvider>
}


