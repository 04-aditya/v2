import React from "react";
import { AppBar, Box, CssBaseline, Paper, TextField, ThemeProvider, Typography } from "@mui/material";
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
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

import Toolbar from '@mui/material/Toolbar';
import logo4dark from 'sharedui/assets/PS_Logo_RGB_dark.png';
import logo4light from 'sharedui/assets/PS_Logo_RGB_light.png';
import logo from '../assets/appicon.svg'
import { useTheme } from "sharedui/theme";
import { Outlet } from "react-router-dom";
import { useChatHistory } from "../api/chat";
import ForumIcon from '@mui/icons-material/Forum';

const drawerWidth = 220;

interface Props {
  /**
   * Injected by the documentation to work in an iframe.
   * You won't need it on your project.
   */
  window?: () => Window;
}

export default function AppLayout(props: Props) {
  const {colorMode, mode, theme} = useTheme();
  const { window } = props;
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const {data:history} = useChatHistory();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box sx={{height:'100%', display:'flex', flexDirection:'column'}}>
      <Toolbar>
        <img src={logo} height={48} alt={`${process.env['NX_APP_NAME']} logo`}/>
        <Typography variant="h6" noWrap component="div" sx={{ml:2}}>
          {process.env['NX_APP_NAME']}
        </Typography>
      </Toolbar>
      {/*
      <Toolbar/>
      <img src={mode==='dark'?logo4dark:logo4light} height={48} alt="PS logo"/>

      <Divider />
      */}
      <Box sx={{flexGrow:1, maxHeight:600,}} className="scrollbarv">
        <List>
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemIcon>
                <InboxIcon />
              </ListItemIcon>
              <ListItemText primary={'Chat History'} />
            </ListItemButton>
          </ListItem>
          {(history||[]).map((item, index) => (
            <ListItem key={index} disablePadding>
              <ListItemButton>
                <ListItemIcon>
                  <ForumIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary={item.name} />
              </ListItemButton>
            </ListItem>
          ))}
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
          <ListItemButton>
            <ListItemIcon>
              <InfoIcon/>
            </ListItemIcon>
            <ListItemText primary={`About ${process.env['NX_APP_NAME']}`} />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  const container = window !== undefined ? () => window().document.body : undefined;

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
        <Typography variant="h6" noWrap component="div" sx={{display: { sm: 'none' }}}>
          {process.env['NX_APP_NAME']}
        </Typography>
      </Toolbar>
    </AppBar>
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
        {drawer}
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
        {drawer}
      </Drawer>
    </Box>
    <Box
        component="main"
        sx={{ flexGrow: 1, p: 1, width: { sm: `calc(100% - ${drawerWidth}px)`, display:'flex',
        flexDirection:'column', height:'100%' } }}
      >
        <Toolbar />
        <Box sx={{display:'flex', flexGrow:1, flexDirection:'column',m:1}} >
          <Outlet/>
        </Box>
    </Box>
  </Box>
  </ThemeProvider>
}
