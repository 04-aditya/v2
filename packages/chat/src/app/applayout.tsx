import React from "react";
import { AppBar, Box, Button, CssBaseline, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Menu, MenuItem, Paper, Skeleton, TextField, ThemeProvider, Typography, useMediaQuery } from "@mui/material";
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
import InfoIcon from '@mui/icons-material/Info';
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
import {formatDistanceToNow, parseJSON} from 'date-fns';
import ReactMarkdown from "react-markdown";
import useAuth from "psnapi/useAuth";
import ChatSessionList from "../components/ChatSessionList";
import useAxiosPrivate from "psnapi/useAxiosPrivate";

const drawerWidth = 260;

interface Props {
  /**
   * Injected by the documentation to work in an iframe.
   * You won't need it on your project.
   */
  window?: () => Window;
}

export default function AppLayout(props: Props) {
  const { auth, setAuth } = useAuth();
  const axios = useAxiosPrivate();
  const navigate = useNavigate();
  const {colorMode, mode, theme} = useTheme();
  const { window } = props;
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

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

  const DrawerContent = (props: any)=>(
    <Box sx={{height:'100%', display:'flex', flexDirection:'column'}}>
      <Toolbar>
        <img src={logo} height={48} alt={`${process.env['NX_APP_NAME']} logo`} onClick={()=>navigate('/')} style={{cursor: 'pointer'}}/>
        <Typography variant="h6" noWrap component="div" sx={{ml:2, cursor: 'pointer'}} onClick={()=>navigate('/')}>
          {process.env['NX_APP_NAME']}
        </Typography>
      </Toolbar>
      {/*
      <Toolbar/>
      <img src={mode==='dark'?logo4dark:logo4light} height={48} alt="PS logo"/>

      <Divider />
      */}
      <Box sx={{flexGrow:1, maxHeight:600,}} className="scrollbarv">
        <List dense>
          <ListItem disablePadding>
            <ListItemButton onClick={()=>navigate('/')}>
              <ListItemIcon>
                <AddCommentIcon/>
              </ListItemIcon>
              <ListItemText primary={'New Chat'} />
            </ListItemButton>
          </ListItem>
          <ChatSessionList type='private' icon={<ForumIcon sx={{color:'#999'}}/>}/>
          {/* {(history||[]).map((item, index) => (
            <ListItem key={index} disablePadding>
              <ListItemButton onClick={()=>navigate(`/chat/${item.id}`)}>
                <ListItemIcon>
                  <ForumIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary={item.name} secondary={formatDistanceToNow(parseJSON(item.updatedAt),{addSuffix:true})} />
              </ListItemButton>
            </ListItem>
          ))} */}
        </List>
      </Box>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={colorMode.toggleColorMode}>
            <ListItemIcon>
              {mode==='dark'?<LightModeIcon/>:<DarkModeIcon/>}
            </ListItemIcon>
            <ListItemText primary={mode==='dark' ? 'Light Mode' : 'Dark Mode'} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <AboutDialog/>
        </ListItem>
      </List>
    </Box>
  );

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
      <MenuItem onClick={()=>{
        //const returnUrl = global.window.location.href;
        axios.get(`${process.env['NX_API_URL']}/auth/logout`)
          .then(()=>{
            setAuth({});
            navigate('/login');
            //navigate(`https://login.microsoftonline.com/common/oauth2/v2.0/logout?post_logout_redirect_uri=${global.window.location.protocol}://${global.window.location.hostname}/login`);
          })
          .catch(console.error);
      }}
      >Logout</MenuItem>
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
            <AccountCircle />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
    {renderProfileMenu}
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
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
        <DrawerContent auth={auth}/>
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {borderRadius:2, boxSizing: 'border-box', width: drawerWidth, borderRight:'0px' },
        }}
        PaperProps={{
          sx:{backgroundColor:'transparent'}
        }}
        open
      >
        <DrawerContent auth={auth}/>
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
function AboutDialog() {
  const [open, setOpen] = React.useState(false);
  const {theme} = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <ListItemButton onClick={handleClickOpen}>
        <ListItemIcon>
          <InfoIcon/>
        </ListItemIcon>
        <ListItemText primary={`About ${process.env['NX_APP_NAME']}`} />
      </ListItemButton>
      <Dialog
        fullScreen={fullScreen}
        open={open}
        onClose={handleClose}
        aria-labelledby="about-dialog-title"
      >
        <DialogTitle id="about-dialog-title">
          <img src='/assets/appicon.svg' alt="pschat application logo" width="22px"/> {`About ${process.env['NX_APP_NAME']}`}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            PS Chat - An AI ChatBot for Publicis Sapient employees.<br/>
            <ReactMarkdown>{`
> It’s our Groupe position that employees are free to use any emerging tools to speed the development of pitches, strategies, concepts, POCs,
> perspectives or thought leadership for our clients’ consumption. However, when considering how to implement these ideas for
> public consumption there are limitations and risks.
>

> Currently only OpenAI toolsets should be considered for direct consumer engagement with AI experiences and AI output.
> That means text from GPT, images from Dalle, code from Codex and speech to text from Whisper are approved go to market solutions.
>
>
> Due to the legal landscape surrounding AI, these solutions do need to be used with appropriate business and legal involvement
> and review in the same manner as other creative work produced for publication.
            `}</ReactMarkdown>
            <Skeleton width="100%" height={20} animation="wave"/>
            <Skeleton width="80%" height={20} animation="wave"/>
            <Skeleton width="90%" height={20} animation="wave"/>
            <Typography variant="caption">for any queries,
              please contact <a href="mailto:rakesh.ravuri@publicissapient.com">mailto:rakesh.ravuri@publicissapient.com</a>
            </Typography>
            <br/>
            <Typography variant="caption">
              Please read the <a href='/terms' style={{color:'inherit'}}><strong>terms of service</strong></a>
              &nbsp;&amp;&nbsp;
              <a href='/privacy' style={{color:'inherit'}}><strong>privacy policy</strong></a> for the acceptable usage guidelines.
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} autoFocus>
            Ok
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

