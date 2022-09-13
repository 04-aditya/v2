import React from 'react';
import styles from './devsettings.module.scss';
import { useForm } from "react-hook-form";
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog, { DialogProps } from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  idprefix?: string;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, idprefix, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`${idprefix}-tabpanel-${index}`}
      aria-labelledby={`${idprefix}-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 1 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(prefix:string, index: number) {
  return {
    id: `${prefix}-tab-${index}`,
    'aria-controls': `${prefix}-tabpanel-${index}`,
  };
}

function GeneratePAT() {
  const [open, setOpen] = React.useState(false);
  const [scroll, setScroll] = React.useState<DialogProps['scroll']>('paper');

  const handleClickOpen = (scrollType: DialogProps['scroll']) => () => {
    setOpen(true);
    setScroll(scrollType);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Button variant='outlined' size='small' onClick={handleClickOpen('paper')}>Generate new token</Button>
      <Dialog
        open={open}
        onClose={handleClose}
        scroll={scroll}
        aria-labelledby="generate-pat-dialog-title"
        aria-describedby="generate-pat-dialog-description"
      >
        <DialogTitle id="generate-pat-dialog-title">New personal access token</DialogTitle>
        <DialogContent dividers={scroll === 'paper'}>
          <DialogContentText
            id="generate-pat-dialog-description"
          >
            <Typography variant='body1'>Personal access tokens function like ordinary OAuth access tokens.
            They can be used to authenticate to the API over Bearer Authentication.</Typography>
          </DialogContentText>


          <div>
            {`Cras mattis consectetur purus sit amet fermentum.
Cras justo odio, dapibus ac facilisis in, egestas eget quam.
Morbi leo risus, porta ac consectetur ac, vestibulum at eros.
Praesent commodo cursus magna, vel scelerisque nisl consectetur et.`}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant='contained' color='success' onClick={handleClose}>Generate Token</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

/* eslint-disable-next-line */
export interface DevSettingsProps {}

export function DevSettings(props: DevSettingsProps) {
  const [tabValue, setTabValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  return (
    <Box sx={{m:2}}>
      <Typography variant='h6'>Developer Settings</Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleChange} aria-label="basic tabs example">
          <Tab label="Personal access tokens" {...a11yProps('devsettings', 0)} />
          <Tab label="Activity" {...a11yProps('devsettings', 1)} />
        </Tabs>
      </Box>
      <TabPanel value={tabValue} index={0} idprefix={'devsettings'}>
        <GeneratePAT/> <Button color='error' size='small'>Revoke all</Button>
        <hr/>
        <Typography variant='body1'>Tokens you have generated that can be used to access the <a href={`${process.env['NX_API_URL']}/api-docs`} target='blank'>PSNext API</a>.</Typography>
      </TabPanel>
      <TabPanel value={tabValue} index={1} idprefix={'devsettings'}>
        <Typography variant='h6'>App Activity</Typography>
      </TabPanel>
    </Box>
  );
}

export default DevSettings;
