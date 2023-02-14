import { Box, FormControl, FormHelperText, InputLabel, MenuItem, Select, SelectChangeEvent, Tab, Tabs, Typography } from '@mui/material';
import { Route, Link, Outlet, useParams,useSearchParams } from 'react-router-dom';
import { appstateDispatch } from '@/hooks/useAppState';
import styles from './dashboard.module.scss';
import React, { useEffect } from 'react';
import { useUser, useUserSnapshotDates } from '@/api/users';
import { NumberStatWidget, PercentStatWidget, PieStatWidget, StatWidget } from '@/components/StatWidget';
import { useUserStats } from '@/api/users';
import { Row } from '@/components/Row';
import { TabPanel, a11yProps } from '@/components/TabPanel';
import { format, parse as parseDate } from 'date-fns';


function PeopleStats({snapshot_date}:{snapshot_date:string}) {
  const { userId } = useParams();
  const {data:stats} = useUserStats(userId,['Total Count', 'Directs', 'Leverage', 'Diversity %', 'FTE %', 'PS Exp','TiT Exp'], snapshot_date);
  const [statDetails, setStatDetails] = React.useState<React.ReactNode>(null);

  const totalStat = stats?.find(s=>s.name==='Total Count');
  const directsStat = stats?.find(s=>s.name==='Directs');
  const leverageStat = stats?.find(s=>s.name==='Leverage');
  const deiStat = stats?.find(s=>s.name==='Diversity %');
  const fteStat = stats?.find(s=>s.name==='FTE %');
  const psexpStat = stats?.find(s=>s.name==='PS Exp');
  const titexpStat = stats?.find(s=>s.name==='TiT Exp');
  return <Row flexWrap={'wrap'} sx={{my:1}} justifyContent='flex-start'>
  {totalStat?<NumberStatWidget
    valueTopLeft={totalStat.industry} valueTopRight={totalStat.account}
    value={totalStat.value}
    valueBottomLeft={totalStat.all} valueBottomRight={totalStat.capability}
    title='Total Count'
    sx={{m:0.5}}/>:null}
  {directsStat?<NumberStatWidget
    valueTopLeft={Math.trunc(directsStat.industry*10)/10} valueTopRight={Math.trunc(directsStat.account*10)/10}
    value={directsStat.value}
    valueBottomLeft={Math.trunc(directsStat.all*10)/10} valueBottomRight={Math.trunc(directsStat.capability*10)/10}
    title='Directs'
    sx={{m:0.5}}/>:null}
  {fteStat?<PercentStatWidget
    valueTopLeft={Math.trunc(fteStat.industry*1000)/10} valueTopRight={Math.trunc(fteStat.account*1000)/10}
    value={Math.trunc(fteStat.value*1000)/10}
    valueBottomLeft={Math.trunc(fteStat.all*1000)/10} valueBottomRight={Math.trunc(fteStat.capability*1000)/10}
    title='FTE %' sx={{m:0.5}}/>:null}
  {deiStat?<PercentStatWidget
    valueTopLeft={Math.trunc(deiStat.industry*1000)/10} valueTopRight={Math.trunc(deiStat.account*1000)/10}
    value={Math.trunc(deiStat.value*1000)/10}
    valueBottomLeft={Math.trunc(deiStat.all*1000)/10} valueBottomRight={Math.trunc(deiStat.capability*1000)/10}
    title='Diversity %'
    sx={{m:0.5}}/>:null}
  <PieStatWidget
    valueTopLeft={[{name:'JA', value:11},{name:'A', value:35},{name:'SA', value:35},{name:'Mgr', value:10.5},{name:'SM', value:2},{name:'D', value:1},{name:'VP', value:0.5}]}
    valueTopRight={[{name:'JA', value:5},{name:'A', value:30},{name:'SA', value:45},{name:'Mgr', value:13.5},{name:'SM', value:4},{name:'D', value:2},{name:'VP', value:0.5}]}
    value={leverageStat?.value||[]}
    title='Leverage' sx={{m:0.5}}/>
  {psexpStat?<NumberStatWidget
    valueTopLeft={Math.trunc(psexpStat.industry*100)/100} valueTopRight={Math.trunc(psexpStat.account*100)/100}
    value={Math.trunc(psexpStat.value*100)/100}
    valueBottomLeft={Math.trunc(psexpStat.all*100)/100} valueBottomRight={Math.trunc(psexpStat.capability*100)/100}
    title='Avg PS Experience'
    sx={{m:0.5}}/>:null}
    {titexpStat?<NumberStatWidget
      valueTopLeft={Math.trunc(titexpStat.industry*100)/100} valueTopRight={Math.trunc(titexpStat.account*100)/100}
      value={Math.trunc(titexpStat.value*100)/100}
      valueBottomLeft={Math.trunc(titexpStat.all*100)/100} valueBottomRight={Math.trunc(titexpStat.capability*100)/100}
      title='Avg Time in Title'
      sx={{m:0.5}}/>:null}
  {/* <StatWidget title='KPI' baseline={'baseline'} sx={{m:0.5}}>{'N/A'}</StatWidget>
  <StatWidget title='KPI' leftNode={'VL'} sx={{m:0.5}}/>
  <StatWidget title='KPI' rightNode={'VR'} sx={{m:0.5}}/>
  <StatWidget title='KPI' baseline={'baseline'} sx={{m:0.5}}/> */}
</Row>
}

/* eslint-disable-next-line */
export interface DashboardProps {
}

export function Dashboard(props: DashboardProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [snapshot_date, setSnapshotDate] = React.useState<string>('');
  // const {data:user} = useUser(userId)
  const {data: snapshot_dates} = useUserSnapshotDates();
  const [tabValue, setTabValue] = React.useState(0);

  const handleSnapshotDateChange = (event: SelectChangeEvent) => {
    setSnapshotDate(event.target.value);
  };

  useEffect(() => {
    appstateDispatch({type:'title', data:'Dashboard - PSNext'});
  }, []);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <div className={styles['container']}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
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
              <MenuItem value="">
                <em>Last</em>
              </MenuItem>
              {snapshot_dates?.map(d=><MenuItem key={d} value={d}>{d}</MenuItem>)}
            </Select>
            <FormHelperText>select date</FormHelperText>
          </FormControl>
        </Row>
        <Tabs value={tabValue} onChange={handleChange} aria-label="statistics tabs">
          <Tab label="People" {...a11yProps('People', 0)} />
          <Tab label="Learning" {...a11yProps('Learning', 1)} />
          <Tab label="Hiring" {...a11yProps('Hiring', 2)} />
          <Tab label="Delivery" {...a11yProps('Delivery', 3)} />
          <Tab label="Finance" {...a11yProps('Finance', 4)} />
        </Tabs>
      </Box>
      <TabPanel value={tabValue} index={0} idprefix={'People'}>
        <PeopleStats snapshot_date={snapshot_date} />
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
    </div>
  );
}

export default Dashboard;
