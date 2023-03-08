import { Box, CircularProgress, FormControl, FormHelperText, Grid, IconButton, InputLabel, MenuItem, Paper, Select, SelectChangeEvent, Tab, Tabs, Typography } from '@mui/material';
import { Route, Link, Outlet, useParams,useSearchParams, useNavigate } from 'react-router-dom';
import { appstateDispatch } from '@/hooks/useAppState';
import styles from './dashboard.module.scss';
import React, { useEffect, useMemo } from 'react';
import { useUser, useUserSnapshotDates, useUserTeam, useUserStats, useUserGroups } from '@/api/users';
import { NumberStatWidget, PercentStatWidget, PieStatWidget, StatWidget } from '@/components/StatWidget';
import { Row } from '@/components/Row';
import { TabPanel, a11yProps } from '@/components/TabPanel';
import { format, parse as parseDate } from 'date-fns';
import BasicUserCard from '@/components/BasicUserCard';
import { Stack } from '@mui/system';
import Skeleton from '@mui/material/Skeleton';
import EmailIcon from '@mui/icons-material/Email';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { IStatsData } from 'sharedtypes';
import useAxiosPrivate from '@/hooks/useAxiosPrivate';
import { displayNotification } from '@/hooks/useNotificationState';
import { FileUploadButton } from '@/components/FileUploadDialog';


type PeopleStatsProps = {
  snapshot_date: string|Date,
  userId?: string|number,
  size: 'small'|'medium'|'large',
  onStatsLoaded?: ()=>void;
}

function PeopleStats({snapshot_date, userId, size}:PeopleStatsProps) {
  const {data:user} = useUser(userId);
  const {data:userGroups=[]} = useUserGroups(userId);
  const [userGroup, setUserGroup] = React.useState<string>('org:Team');
  const {data:stats, isLoading} = useUserStats(userId,['Total Count', 'Directs', 'Leverage', 'Diversity %', 'FTE %', 'PS Exp','TiT Exp'], [userGroup], snapshot_date);
  const [statDetails, setStatDetails] = React.useState<React.ReactNode>(null);

  useEffect(()=>{
    setUserGroup('org:Team');
  }, [userId])
  // const options = useMemo(()=>{
  //   if (!stats) return [];
  //   const ops = [];
  //   for (const stat:IStatsData<number> of stats) {
  //     if (stats.name === 'Total Count') {
  //       ops.push({name: 'Total Count', value: stat.value});
  //     }
  //   }
  //   return ops;
  // }, [stats])
  const totalStat: IStatsData<number> = stats?.find(s=>s.name==='Count');
  const directsStat: IStatsData<number> = stats?.find(s=>s.name==='Directs');
  const leverageStat: IStatsData< Array<{name: string, value: number}> > = stats?.find(s=>s.name==='Leverage');
  const deiStat: IStatsData<number> = stats?.find(s=>s.name==='Diversity %');
  const fteStat: IStatsData<number> = stats?.find(s=>s.name==='FTE %');
  const psexpStat: IStatsData<number> = stats?.find(s=>s.name==='PS Exp');
  const titexpStat: IStatsData<number> = stats?.find(s=>s.name==='TiT Exp');

  const handleUserGroupChange = (event: SelectChangeEvent) => {
    setUserGroup(event.target.value);
  }

  if (userGroups.length===0)
    return <Box>
      <Row sx={{m:1}}>
        <Typography variant='caption'>No reportees.</Typography>
      </Row>
    </Box>

  return <Box>
    <Row sx={{m:1}}>
      <Typography variant='caption'>People Stats aggregated for <Select value={userGroup} onChange={handleUserGroupChange} variant='standard'>
          {userGroups.map((g,i)=><MenuItem key={g.name+g.type+i} value={g.type+':'+g.name}><strong>{g.name}</strong>&nbsp;{g.type} members</MenuItem>)}
        </Select>
      </Typography>

      {/* {userGroups.length>2 && size!=='small'?<Typography variant='caption'>&nbsp;compare People Stats with <Select value={userGroup} onChange={handleUserGroupChange} variant='standard'>
          {userGroups.map((g,i)=><MenuItem key={g.name+g.type+i} value={g.type+':'+g.name}><strong>{g.name}</strong>&nbsp;{g.type} members</MenuItem>)}
        </Select>
      </Typography>:null} */}

    </Row>
    {isLoading?<Row flexWrap={'wrap'} sx={{my:1}} justifyContent='flex-start'>
        <CircularProgress/>
      </Row> : <Row flexWrap={'wrap'} sx={{my:1}} justifyContent='flex-start'>
      {userGroup==='org:directs' ? directsStat &&  <NumberStatWidget size={size}
        valueTopLeft ={directsStat.industry} valueTopRight={directsStat.account}
        value={directsStat.value}
        valueBottomLeft={directsStat.all} valueBottomRight={directsStat.capability}
        title='Directs'
        sx={{m:0.5}}/> : totalStat && <NumberStatWidget size={size}
        valueTopLeft ={totalStat.industry} valueTopRight={totalStat.account}
        value={totalStat.value}
        valueBottomLeft={totalStat.all} valueBottomRight={totalStat.capability}
        title='Count'
        sx={{m:0.5}}/>}
      {fteStat?<PercentStatWidget size={size}
        valueTopLeft={fteStat.industry ? Math.trunc(fteStat.industry*1000)/10 : ''} valueTopRight={fteStat.account ? Math.trunc(fteStat.account*1000)/10 : ''}
        value={Math.trunc(fteStat.value*1000)/10}
        valueBottomLeft={fteStat.all ? Math.trunc(fteStat.all*1000)/10 : ''} valueBottomRight={fteStat.capability ? Math.trunc(fteStat.capability*1000)/10 : ''}
        title='FTE %' sx={{m:0.5}}/>:null}
      {deiStat?<PercentStatWidget size={size}
        valueTopLeft={deiStat.industry ? Math.trunc(deiStat.industry*1000)/10 : ''} valueTopRight={deiStat.account ? Math.trunc(deiStat.account*1000)/10 : ''}
        value={Math.trunc(deiStat.value*1000)/10}
        valueBottomLeft={deiStat.all ? Math.trunc(deiStat.all*1000)/10 : ''} valueBottomRight={deiStat.capability ? Math.trunc(deiStat.capability*1000)/10 : ''}
        title='Diversity %'
        sx={{m:0.5}}/>:null}
      <PieStatWidget size={size}
        valueTopLeft={[{name:'JA', value:11},{name:'A', value:35},{name:'SA', value:35},{name:'Mgr', value:10.5},{name:'SM', value:2},{name:'D', value:1},{name:'VP', value:0.5}]}
        valueTopRight={[{name:'JA', value:5},{name:'A', value:30},{name:'SA', value:45},{name:'Mgr', value:13.5},{name:'SM', value:4},{name:'D', value:2},{name:'VP', value:0.5}]}
        value={leverageStat?.value||[]}
        title='Leverage' sx={{m:0.5}}/>
      {psexpStat?<NumberStatWidget size={size}
        valueTopLeft={psexpStat.industry ? Math.trunc(psexpStat.industry*100)/100 : ''} valueTopRight={psexpStat.account ? Math.trunc(psexpStat.account*100)/100 : ''}
        value={Math.trunc(psexpStat.value*100)/100}
        valueBottomLeft={psexpStat.all ? Math.trunc(psexpStat.all*100)/100 : ''} valueBottomRight={psexpStat.capability ? Math.trunc(psexpStat.capability*100)/100 : ''}
        title='Avg PS Experience'
        sx={{m:0.5}}/>:null}
        {titexpStat?<NumberStatWidget size={size}
          valueTopLeft={titexpStat.industry ? Math.trunc(titexpStat.industry*100)/100 : ''} valueTopRight={titexpStat.account ? Math.trunc(titexpStat.account*100)/100 : ''}
          value={Math.trunc(titexpStat.value*100)/100}
          valueBottomLeft={titexpStat.all ? Math.trunc(titexpStat.all*100)/100 : ''} valueBottomRight={titexpStat.capability ? Math.trunc(titexpStat.capability*100)/100 : ''}
          title='Avg Time in Title'
          sx={{m:0.5}}/>:null}
      {/* <StatWidget title='KPI' baseline={'baseline'} sx={{m:0.5}}>{'N/A'}</StatWidget>
      <StatWidget title='KPI' leftNode={'VL'} sx={{m:0.5}}/>
      <StatWidget title='KPI' rightNode={'VR'} sx={{m:0.5}}/>
      <StatWidget title='KPI' baseline={'baseline'} sx={{m:0.5}}/> */}
    </Row>}
  </Box>
}

/* eslint-disable-next-line */
export interface DashboardProps {
}

export function Dashboard(props: DashboardProps) {
  const { userId } = useParams();
  const {data:user} = useUser(userId)
  const {data:teamMembers} = useUserTeam(userId,[],['org:Directs']);
  const axios = useAxiosPrivate();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [snapshot_date, setSnapshotDate] = React.useState<string>('Last');
  const {data: snapshot_dates} = useUserSnapshotDates();
  const [tabValue, setTabValue] = React.useState(0);

  const handleSnapshotDateChange = (event: SelectChangeEvent) => {
    setSnapshotDate(event.target.value);
  };

  useEffect(() => {
    if (user) {
      appstateDispatch({type:'title', data:`Dashboard for ${user.first_name+' '+user.last_name}`});
    } else {
      appstateDispatch({type:'title', data:`Dashboard - Loading...`});
    }
  }, [user]);

  const directs = useMemo(()=>{
    if (user && teamMembers) {
      return teamMembers
        .filter(u => u.supervisor_id===user.oid || u.supervisor_id===user.csid)
        .sort((a,b)=>(a.first_name||'').localeCompare(b.first_name||''));
    } else {
      return [];
    }
  }, [user, teamMembers])

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{displar:'flex'}}>
      <div>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <BasicUserCard user={user} sx={{m:1}}/>
          <Row spacing={1}>
            <FormControl sx={{ m: 1, minWidth: 150 }} size='small'>
              <InputLabel id="snapshotdate-selector-label">Snapshot Date</InputLabel>
              <Select
                labelId="snapshotdate-selector-label"
                id="snapshotdate-selector"
                value={snapshot_date}
                label="Snapshot Date"
                onChange={handleSnapshotDateChange}
              >
                <MenuItem value="Last">
                  <em>Last</em>
                </MenuItem>
                {snapshot_dates?.map(d=>d?<MenuItem key={d.toString()} value={d.toISOString()}>{format(d,'MMM dd')}</MenuItem>:null)}
              </Select>
            </FormControl>
          </Row>
          <Tabs value={tabValue} onChange={handleChange} aria-label="statistics tabs" sx={{mx:1}}>
            <Tab label="People" {...a11yProps('People', 0)} />
            <Tab label="Learning" {...a11yProps('Learning', 1)} />
            <Tab label="Hiring" {...a11yProps('Hiring', 2)} />
            <Tab label="Delivery" {...a11yProps('Delivery', 3)} />
            <Tab label="Finance" {...a11yProps('Finance', 4)} />
          </Tabs>
        </Box>
        <TabPanel value={tabValue} index={0} idprefix={'People'}>
          <PeopleStats snapshot_date={snapshot_date} size='large' userId={userId}/>
          {directs.map(u=><Box key={u.id} sx={{mx:1, my:2, width:'100%', borderColor:'#ccc', borderTopStyle:'solid', borderTopWidth:1}}>
              <Grid container spacing={1} sx={{p:1}}>
                <Grid item xs={12} md={4} lg={3}>
                  <Stack spacing={1} direction='column' justifyContent='center' sx={{height:'100%'}}>
                    <Typography variant='caption'>
                      <strong>{u.first_name+' '+u.last_name}</strong>
                      <IconButton size="small" aria-label='email' LinkComponent='a' href={`mailto:${u.email}`} ><EmailIcon fontSize='small' /></IconButton>
                      <IconButton size="small" aria-label='dashboard' onClick={e=>navigate(`/dashboard/${u.email}`)} ><DashboardIcon fontSize='small' /></IconButton>
                    </Typography>
                    <Typography variant='caption'>{u.business_title}</Typography>
                    <Typography variant='caption'></Typography>
                  </Stack>
                </Grid>
                <Grid item xs={12} md={8} lg={9}>
                  <PeopleStats snapshot_date={snapshot_date} size='small' userId={u.id}/>
                </Grid>
              </Grid>
            </Box>)}
        </TabPanel>
        {/* <fieldset style={{borderRadius:4, borderColor: '#00000020', fontSize: '0.75em', padding: '0.5em'}}> */}
        <TabPanel value={tabValue} index={1} idprefix={'Learning'}>
            <Row flexWrap={'wrap'} sx={{my:1}} justifyContent='flex-start'>
              <StatWidget title='Learning Hours' baseline={'baseline'} sx={{m:0.5}}>{'2.5 / 5'}</StatWidget>
              <StatWidget title='Certifications' sx={{m:0.5}}>{'N/A'}</StatWidget>
              <StatWidget title='KPI1' sx={{m:0.5}}>{'N/A'}</StatWidget>
              <StatWidget title='KPI2' sx={{m:0.5}}>{'N/A'}</StatWidget>
            </Row>
        </TabPanel>
        <TabPanel value={tabValue} index={2} idprefix={'Hiring'}>
            <Row flexWrap={'wrap'} sx={{my:1}} justifyContent='flex-start'>
              <StatWidget title='Hiring Hours' sx={{m:0.5}}>{'N/A'}</StatWidget>
              <StatWidget title='Interview Slots' sx={{m:0.5}}>{'N/A'}</StatWidget>
              <StatWidget title='Certifications' sx={{m:0.5}}>{'N/A'}</StatWidget>
            </Row>
        </TabPanel>
        <TabPanel value={tabValue} index={3} idprefix={'Delivery'}>
            <Row flexWrap={'wrap'} sx={{my:1}} justifyContent='flex-start'>
              <StatWidget title='Speed' sx={{m:0.5}}>{'N/A'}</StatWidget>
              <StatWidget title='Value' sx={{m:0.5}}>{'N/A'}</StatWidget>
              <StatWidget title='Quality' sx={{m:0.5}}>{'N/A'}</StatWidget>
            </Row>
        </TabPanel>
        <TabPanel value={tabValue} index={4} idprefix={'Finance'}>
            <Row flexWrap={'wrap'} sx={{my:1}} justifyContent='flex-start'>
              <StatWidget title='Billability' sx={{m:0.5}} >{'N/A'}</StatWidget>
              <StatWidget title='Yeild' sx={{m:0.5}} >{'N/A'}</StatWidget>
              <StatWidget title='Sales Time' sx={{m:0.5}} >{'N/A'}</StatWidget>
            </Row>
        </TabPanel>
        <Box sx={{p:1}}>
        </Box>
      </div>
      {/* <Outlet/>
      <hr/>
      <h1>Welcome to Dashboard!</h1>
      <h2>Welcome to Dashboard!</h2>
      <h3>Welcome to Dashboard!</h3>
      <h4>Welcome to Dashboard!</h4>
      <h5>Welcome to Dashboard!</h5>
      <p>This is the Dashboard root route.</p>
      <hr/>
      <Box sx={{ width: '500px', p:2 }}>
        <Typography variant="h1" component="div" gutterBottom>
          h1. Heading
        </Typography>
        <Typography variant="h2" gutterBottom component="div">
          h2. Heading
        </Typography>
        <Typography variant="h3" gutterBottom component="div">
          h3. Heading
        </Typography>
        <Typography variant="h4" gutterBottom component="div">
          h4. Heading
        </Typography>
        <Typography variant="h5" gutterBottom component="div">
          h5. Heading
        </Typography>
        <Typography variant="h6" gutterBottom component="div">
          h6. Heading
        </Typography>
        <Typography variant="subtitle1" gutterBottom component="div">
          subtitle1. Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quos
          blanditiis tenetur
        </Typography>
        <Typography variant="subtitle2" gutterBottom component="div">
          subtitle2. Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quos
          blanditiis tenetur
        </Typography>
        <Typography variant="body1" gutterBottom>
          body1. Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quos
          blanditiis tenetur unde suscipit, quam beatae rerum inventore consectetur,
          neque doloribus, cupiditate numquam dignissimos laborum fugiat deleniti? Eum
          quasi quidem quibusdam.
        </Typography>
        <Typography variant="body2" gutterBottom>
          body2. Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quos
          blanditiis tenetur unde suscipit, quam beatae rerum inventore consectetur,
          neque doloribus, cupiditate numquam dignissimos laborum fugiat deleniti? Eum
          quasi quidem quibusdam.
        </Typography>
        <Typography variant="button" display="block" gutterBottom>
          button text
        </Typography>
        <Typography variant="caption" display="block" gutterBottom>
          caption text
        </Typography>
        <Typography variant="overline" display="block" gutterBottom>
          overline text
        </Typography>
      </Box> */}
    </Box>
  );
}

export default Dashboard;
