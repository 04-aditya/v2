import React, { Children, useCallback, useEffect, useMemo } from 'react';
import { Controller, SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
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
import { Checkbox, FormControlLabel, FormLabel, Grid, List, ListItem, ListItemButton, ListItemIcon, ListItemText, MenuItem, Paper, Stack, Switch, TextField } from '@mui/material';
import { appstateDispatch } from '@/hooks/useAppState';
import { IPermission, IUserPAT } from 'sharedtypes';
import { useUserPATs, useUserPermissions } from '@/api/users';
import useAxiosPrivate from '@/hooks/useAxiosPrivate';
import { formatDistanceToNow, parseJSON } from 'date-fns';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { ClipCopyButton } from '@/components/ClipCopyButton';
import GppMaybeIcon from '@mui/icons-material/GppMaybe';
import { Row } from '@/components/RowColumn';
import { addDays } from 'date-fns';
import { TabPanel, a11yProps } from '@/components/TabPanel';


type PATFormSchema = {
  name: string;
  expiration: string;
};


function GeneratePAT({onSuccess}:{onSuccess:(pat:IUserPAT)=>void}) {
  const axios = useAxiosPrivate();
  const {data: permissions} = useUserPermissions();
  const [open, setOpen] = React.useState(false);
  const [selectedPerms, setSelectedPerms] = React.useState<IPermission[]>([]);

  const { control, handleSubmit, formState } = useForm<PATFormSchema>({
    defaultValues:{
      name: '',
      expiration: '30d'
    }
  });

  const onError: SubmitErrorHandler<PATFormSchema> = (errors) => console.log(errors);
  const onSubmit: SubmitHandler<PATFormSchema> = async (data: PATFormSchema) => {
    const newPAT: IUserPAT =  {
      ...data,
      id:'',
      permissions: selectedPerms.map(p => p.name)
    };
    const res = await axios.post(`/api/users/me/pat`, newPAT);

    if (res.status === 200) {
      onSuccess(res.data.data);
      setOpen(false);
    }
  }

  const handleClickOpen = () => {
    setOpen(true);
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
      setSelectedPerms([...permissions||[]]);
    } else {
      setSelectedPerms([]);
    }
  }

  return (
    <>
      <Button variant='outlined' size='small' onClick={handleClickOpen}>Generate new token</Button>
      <Dialog
        open={open}
        onClose={handleClose}
        scroll={'paper'}
        aria-labelledby="generate-pat-dialog-title"
        aria-describedby="generate-pat-dialog-description"
      >
        <form onSubmit={handleSubmit(onSubmit, onError)}>
          <DialogTitle id="generate-pat-dialog-title">New personal access token</DialogTitle>
          <DialogContent dividers={true}>
            <DialogContentText
              id="generate-pat-dialog-description"
            >
              Personal access tokens function like ordinary OAuth access tokens.
              They can be used to authenticate to the API over Bearer Authentication.
            </DialogContentText>

            <Stack spacing={2} sx={{py:1}}>
              <Controller name='name' control={control}
                rules={{
                  required:'Please specify a valid name for the token',
                  minLength:{value:4, message: 'name should be atleast 4 characters long'}
                }}
                render={({field})=><TextField
                  label='Name' helperText={formState.errors.name ? formState.errors.name.message : "What's this token for?"}
                  error={formState.errors.name?true:false}
                  {...field}/>}
              />
              <Controller name='expiration' control={control}
                render={({field})=><TextField  select label='Expiration' {...field}>
                  {[
                    {value: "7d",  label: "7 days"},
                    {value: "30d", label: "30 days"},
                    {value: "60d", label: "60 days"},
                    {value: "90d", label: "90 days"},
                    {value: "120d", label: "120 days"},
                    // {value: "na",  label: "No expiration"},
                  ].map(op=><MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>)}
                </TextField>}/>
                <FormControlLabel
                  control={
                    <Switch checked={(permissions||[]).length===selectedPerms.length} onChange={selectAll}/>
                  }
                  label="Select All"
                />
              <FormLabel><span>Select Permissions</span></FormLabel>
              <Paper variant="outlined" sx={{p:1}}>
                <List sx={{ width: '100%' }}>
                  {(permissions||[]).map(p=>{
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
  const axios = useAxiosPrivate();
  const [tabValue, setTabValue] = React.useState(0);
  const {data, invalidateCache} = useUserPATs();
  const [newPATs, setNewPATs] = React.useState<IUserPAT[]>([]);
  useEffect(() => {
    appstateDispatch({type:'title', data:'Developer Settings - PSNext'});
  }, []);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const onCreateNewPAT = (data: IUserPAT) => {
    console.log(data);
    setNewPATs(pats=>{
      return [data, ...pats];
    })
  }

  const deletePAT = async (id:string)=>{
    const res = await axios.delete(`/api/users/me/pat/${id}`);
    if (res.status === 200) {
      invalidateCache();
    }
  }

  return (
    <Box sx={{m:2}}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleChange} aria-label="basic tabs example">
          <Tab label="Personal access tokens" {...a11yProps('devsettings', 0)} />
          <Tab label="Activity" {...a11yProps('devsettings', 1)} />
        </Tabs>
      </Box>
      <TabPanel value={tabValue} index={0} idprefix={'devsettings'}>
        <GeneratePAT onSuccess={onCreateNewPAT}/> <Button color='error' size='small'>Revoke all</Button>
        <hr/>
        <Typography variant='body1'>Tokens you have generated that can be used to access the <a href={`${process.env['NX_API_URL']}/api-docs`} target='blank'>PSNext API</a>.</Typography>
        <Paper elevation={0} sx={{display:'flex', flexDirection:'column', justifyContent:'stretch', alignItems:'center'}}>
          {[...newPATs, ...(data||[])].map(t=><Grid key={t.id} container spacing={1}>
            <Grid item xs={12}>
              <Row sx={{p:1}} justifyContent='space-between'>
                <Row>
                  <Typography variant='subtitle1'><strong>{t.name}</strong> - {t.token?.substring(0, 4) + '....' + t.token?.substring(t.token?.length - 4)}</Typography>
                  {t.token?.includes('....')?null:<ClipCopyButton text={t.token||''} size='small'/>}
                </Row>
                <Row spacing={1}>
                  {t.lastUsedAt?<Typography variant='subtitle2'><em>last used {formatDistanceToNow(parseJSON(t.lastUsedAt), {addSuffix: true})}</em></Typography>:<Typography variant='subtitle2'>never used</Typography>}
                  <Button color='error' onClick={()=>{ deletePAT(t.id)}}>Delete</Button>
                </Row>
              </Row>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{p:1}}>
                <Typography variant='body2'>{t.permissions.join(', ')}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{p:1, borderBottom:'1px solid lightgray'}}>
                {t.expiresAt?<Row spacing={1}>
                    <AccessTimeIcon fontSize='small'/>
                    <Typography variant='caption'>Expires {formatDistanceToNow(parseJSON(t.expiresAt), {addSuffix: true})}</Typography>
                  </Row>:<Row spacing={1}>
                    <GppMaybeIcon fontSize='small' color='warning'/>
                    <Typography variant='caption' sx={{color:'warning'}}>this token has no expiration</Typography>
                </Row>}
              </Box>
            </Grid>
          </Grid>)}

        </Paper>
      </TabPanel>
      <TabPanel value={tabValue} index={1} idprefix={'devsettings'}>
        <Typography variant='h6'>App Activity</Typography>
      </TabPanel>
    </Box>
  );
}

export default DevSettings;
