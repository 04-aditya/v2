import React, { Children, useCallback, useEffect, useMemo } from 'react';
import styles from './devsettings.module.scss';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from "yup";
import { Controller, useForm } from "react-hook-form";
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
import ControlledFormInput from '@/components/ControlledFormInput';
import { Checkbox, FormControlLabel, FormLabel, List, ListItem, ListItemButton, ListItemIcon, ListItemText, MenuItem, Paper, Select, Stack, Switch } from '@mui/material';
import DTextField from '@/components/DTextField';
import HTree, { HItemData, updateHTreeData } from '@/components/HCheckBox';
import { appstateDispatch } from '@/hooks/useAppState';
import useAuth from '@/hooks/useAuth';
import { IPermission, IUserRole } from '@/../../shared/types/src';
import { useUser } from '@/api/users';

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

type GeneratePATFormData = {
  name: string;
  expiration: string;
};


function GeneratePAT() {
  const {data: user} = useUser()
  const [open, setOpen] = React.useState(false);
  const [scroll, setScroll] = React.useState<DialogProps['scroll']>('paper');
  const [selectedPerms, setSelectedPerms] = React.useState<IPermission[]>([]);

  const { control, handleSubmit, formState:{ errors } } = useForm<GeneratePATFormData>({
    defaultValues:{
      name: '',
      expiration: '30d'
    }
  });

  const onSubmit = (data:any, e:any) => console.log({...data, permissions: selectedPerms});
  const onError = (errors:any, e:any) => console.log(errors);

  const perms = useMemo(()=>{
    if (!user) return [];
    let perms: IPermission[] = [];

    function getPerms(role:IUserRole): IPermission[] {
      let p = [...role.permissions||[]];
      role.children?.forEach(r=>{
        p = p.concat(getPerms(r))
      })
      return p;
    }

    user.roles.forEach(r=>{
      perms=perms.concat(getPerms(r));
    })
    console.log(perms);
    return perms;
  }, [user]);

  const handleClickOpen = (scrollType: DialogProps['scroll']) => () => {
    setOpen(true);
    setScroll(scrollType);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const toggleSelected = useCallback((p:IPermission)=>{
    return ()=>{
      setSelectedPerms(s => {
        const idx = s.findIndex(v=>v.id===p.id);
        if (idx!==-1) {
          s.splice(idx,1);
          return [...s];
        }
        return [...s, p];
      })
    }
  }, []);

  const selectAll = (e: React.ChangeEvent<HTMLInputElement>)=>{
    if (e.target.checked) {
      setSelectedPerms([...perms]);
    } else {
      setSelectedPerms([]);
    }
  }

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
        <form onSubmit={handleSubmit(onSubmit, onError)}>
          <DialogTitle id="generate-pat-dialog-title">New personal access token</DialogTitle>
          <DialogContent dividers={scroll === 'paper'}>
            <DialogContentText
              id="generate-pat-dialog-description"
            >
              <Typography variant='body1'>Personal access tokens function like ordinary OAuth access tokens.
              They can be used to authenticate to the API over Bearer Authentication.</Typography>
            </DialogContentText>

            <Stack spacing={2} sx={{py:1}}>
              <Controller name='name' control={control}
                rules={{
                  required:'Please specify a valid name for the token',
                  minLength:{value:4, message: 'name should be atleast 4 characters long'}
                }}
                render={({field})=><DTextField
                  label='Name' helperText={errors.name ? errors.name.message : "What's this token for?"}
                  error={errors.name?true:false}
                  {...field}/>}
              />
              <Controller name='expiration' control={control}
                render={({field})=><DTextField  select label='Expiration'
                  {...field}>
                  {[
                    {value: "7d",  label: "7 days"},
                    {value: "30d", label: "30 days"},
                    {value: "60d", label: "60 days"},
                    {value: "90d", label: "90 days"},
                    {value: "na",  label: "No expiration"},
                  ].map(op=><MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>)}
                </DTextField>}/>
                <FormControlLabel
                  control={
                    <Switch checked={perms.length===selectedPerms.length} onChange={selectAll}/>
                  }
                  label="Select All"
                />
              <FormLabel><span>Select Permissions</span></FormLabel>
              <Paper variant="outlined" sx={{p:1}}>
                <List sx={{ width: '100%' }}>
                  {perms.map(p=>{
                    return (
                      <ListItem key={p.id} disablePadding>
                        <ListItemButton role={undefined} onClick={toggleSelected(p)} dense>
                          <ListItemIcon>
                            <Checkbox
                              edge="start"
                              checked={selectedPerms.find(v=>v.id===p.id)?true:false}
                              tabIndex={-1}
                              disableRipple
                              inputProps={{ 'aria-labelledby': p.name }}
                          />
                        </ListItemIcon>
                        <ListItemText id={p.name} primary={p.name} secondary={p.description} />
                      </ListItemButton>
                    </ListItem>
                    )
                  })}
                </List>
              </Paper>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button variant='contained' color='success' type='submit'>Generate Token</Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}

/* eslint-disable-next-line */
export interface DevSettingsProps {}

export function DevSettings(props: DevSettingsProps) {
  const [tabValue, setTabValue] = React.useState(0);
  useEffect(() => {
    appstateDispatch({type:'title', data:'Developer Settings - PSNext'});
  }, []);

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
