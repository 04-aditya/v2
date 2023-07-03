import { Box, Button, CircularProgress, Divider, FormControl, FormControlLabel, FormHelperText, Grid, Input, InputLabel, LinearProgress, MenuItem, OutlinedInput, Select, SelectChangeEvent, Tab, Tabs, TextField, Typography } from '@mui/material'
import * as React from 'react'
import { PageHeader } from 'sharedui/components/PageHeader';
import { PageContainer } from 'sharedui/components/PageContainer';
import { useStatTypes } from 'psnapi/stats';
import ButtonPopover from '@/components/ButtonPopover';
import { Row } from '@/components/RowColumn';
import { IStatType, IUser, StatsHelper } from 'sharedtypes';
import { Stack } from '@mui/system';
import { TabPanel, a11yProps } from '@/components/TabPanel';
import * as jp from 'jsonpath';
import { useAllDataKeys, useAllUsers } from 'psnapi/users';
import 'ag-grid-enterprise';
import { AgGridReact } from 'ag-grid-react';

import evaluate from 'static-eval';
import * as esprima from 'esprima';
import { ColDef, ModuleRegistry } from 'ag-grid-enterprise'
import { UserGrid } from '@/components/UserGrid';
import { object } from 'yup';
import { NumberStatWidget, PercentStatWidget, PieStatWidget } from '@/components/StatWidget';

export default function AdminStats() {
  const {data: statTypes=[], isLoading, invalidateCache, mutation} = useStatTypes();
  const [stat, setStat] = React.useState<IStatType>();

  const handleOnStatChange = (newStat:IStatType) => {
    console.log(newStat)
    mutation.mutateAsync(newStat)
      .then((ustat)=>{
        console.log(ustat)
        setStat(ustat);
        invalidateCache();
      })
      .catch(console.error);
  }

  const handleSelectStat = (event: SelectChangeEvent<IStatType>) => {
    if (typeof event.target.value === 'string') return;
    setStat(event.target.value);
  }

  return <PageContainer>
    <PageHeader title='Manage Stat Types' subtitle='' />
    <Select
      value={stat}
      onChange={handleSelectStat}
    >
      {statTypes.map((st:any)=>(<MenuItem key={st.id} value={st}>{st.name}</MenuItem>))}
    </Select>
    {/* <Row spacing={1}>
      <ButtonPopover buttonContent='Add' variant='contained'>
        { isLoading ? <CircularProgress/> : <StatEditor value={stat} onChange={handleOnStatChange}/>}
      </ButtonPopover>
    </Row> */}
    <StatEditor value={stat} onChange={handleOnStatChange}/>
  </PageContainer>
}
function StatEditor(props: {value?:IStatType, onChange:(newValue:IStatType)=>void}) {
  const datakeysQuery = useAllDataKeys();
  const [tabValue, setTabValue] = React.useState(0);
  const [rowData, setRowData] = React.useState<Array<any>>([]);
  const gridStyle = React.useMemo(() => ({height: 300, width: '100%'}), []);
  const [columnDefs, setColumnDefs] = React.useState<ColDef[]>([]);

  const [fieldList, setFieldList] = React.useState<{name:string, expression:string}[]>([]);
  const [statGroup, setStatGroup] = React.useState<string>('');
  const [statName, setStatName] = React.useState<string>('');
  const [statType, setStatType] = React.useState<string>('number');
  const [statExp, setStatExp] = React.useState<string>('*');
  const [statFilter, setStatFilter] = React.useState<string>();
  const [statDesc, setStatDesc] = React.useState<string>();
  const [statAgg, setStatAgg] = React.useState('count');
  const [statDataKeys, setStatDataKeys] = React.useState<string[]>([]);
  const [computedValues, setComputedValues] = React.useState<any>();
  const usersQuery = useAllUsers(statDataKeys);

  const users = React.useMemo(()=>{
    // if (usersQuery.data) {
    //   console.log(usersQuery.data[0]);
    //   console.log(usersQuery.data.find((u:any)=>Object.keys(u.data).length>0))
    // }
    return usersQuery.data || [];
  },[usersQuery.data]);

  const allkeys = React.useMemo (()=>{
    return datakeysQuery.data || [];
  },[datakeysQuery.data]);

  const defaultColDef = React.useMemo<ColDef>(() => {
    return {
      flex: 1,
      minWidth: 150,
      resizable: true,
    };
  }, []);

  const autoGroupColumnDef = React.useMemo<ColDef>(() => {
    return {
      minWidth: 200,
      flex:1,
    };
  }, []);

  React.useEffect(()=>{
    if (props.value) {
      setStatDataKeys(props.value.datakeys);
      setStatGroup(props.value.group);
      setStatName(props.value.name);
      setStatType(props.value.type);
      setStatExp(props.value.expression);
      setStatFilter(props.value.filter);
      setStatAgg(props.value.aggregation)
      setStatDesc(props.value.description);
    }
  }, [props.value]);

  const updateSample = ()=>{
    if (!users || statExp==='') return;

    setFieldList(Object.keys(users[0]).map(k=>({name:k, expression:`$..${k}`})));

    try {
      const colDefs = new Array<ColDef>();
      colDefs.push({headerName:'user', valueGetter:p=>p.data?.raw.email,filter: 'agTextColumnFilter'})
      // const ast = esprima.parseScript(statExp).body[0].expression;
      // evaluate(ast,{})
      const dataset = StatsHelper.extractData(jp, users, statExp, statFilter);
      const aggregatedValue = StatsHelper.calculateAgg(statAgg, dataset, users);
      setComputedValues({value: aggregatedValue});
      // console.log(data);
      // const datatype = typeof datasample;
      // console.log(datatype);
      // console.log(data.length);
      // if (statAgg==='count') {
      //   const value = data.filter(d=>d).length;
      //   setComputedValues({value});
      // } else if (statAgg === 'percent') {
      //   const value=data.filter(d=>d).length/users.length
      //   setComputedValues({value});
      // }
      // if (datatype==='string' || datatype==='number') {
      //   colDefs.push({headerName: statExp, filter: 'agTextColumnFilter'});
      //   if (datatype==='string') {
      //     if (statAgg.startsWith('distinct') || statAgg.startsWith('group')) {
      //       const distinctSet = new Set<string>([...data]);
      //       const distinctValues: string[] = []
      //       distinctSet.forEach(val=>distinctValues.push(val?val:'blank'));
      //       if (statAgg==='group-count') {
      //         setComputedValues({value: [...distinctValues].map((val:string)=>({name: val, value: data.filter((d:string)=>(d?d:'blank')===val).length}))});
      //       } else if (statAgg==='distinct') {
      //         setComputedValues({value: [...distinctValues]});
      //       }
      //     }
      //   } else if (datatype === 'number') {
      //     if (statAgg.startsWith('sum')) {
      //       setComputedValues({value: data.reduce((a:number, b:number)=>a+b, 0)});
      //     } else if (statAgg.startsWith('avg')) {
      //       setComputedValues({value: data.reduce((a:number, b:number)=>a+b, 0)/data.length});
      //     } else if (statAgg.startsWith('min')) {
      //       setComputedValues({value: Math.min(...data)});
      //     } else if (statAgg.startsWith('max')) {
      //       setComputedValues({value: Math.max(...data)});
      //     }
      //   }
      const {data, datasample} = dataset[0];
      if (typeof datasample === 'object') {
        const keys = Object.keys(datasample)
        console.log(keys);
        keys.forEach(key => {
          if (key!=='data') {
            colDefs.push({field : `data.${key}`, filter: 'agTextColumnFilter'})
            return;
          }
          const customDetails: any = datasample.data;
          const customKeys = Object.keys(customDetails);
          customKeys.forEach(customKey => {
            colDefs.push({field : `data.data.${customKey}`,filter: 'agTextColumnFilter'})
          });
        });
      } else {
        colDefs.push({headerName: 'data', filter: 'agTextColumnFilter', flex:1, valueGetter: p=>p.data?.data});
      }
      setColumnDefs(colDefs);

      // add the data to the grid
      setRowData(data);
    } catch (ex) {
      console.error(ex);
    }
  };

  const handleStatAggChange = (event: SelectChangeEvent) => {
    setStatAgg(event.target.value);
  };

  const handleStatGroupChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStatGroup(event.target.value);
  }
  const handleStatNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStatName(event.target.value);
  }
  const handleStatTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStatType(event.target.value);
  }
  const handleStatExpChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStatExp(event.target.value.trim());
  }
  const handleStatFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStatFilter(event.target.value.trim());
  }
  const handleStatDescChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStatDesc(event.target.value);
  }
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  const handleStatDataKeysChange = (event: SelectChangeEvent<string[]>) => {

    if (typeof event.target.value === 'string')
      setStatDataKeys([event.target.value]);
    else
      setStatDataKeys(event.target.value);
  }

  const onSubmit = () => {
    props.onChange({
      id: props.value?.id,
      datakeys: statDataKeys,
      group: statGroup,
      name: statName,
      type: statType,
      expression: statExp,
      filter: statFilter,
      aggregation: statAgg,
      description: statDesc
    })
  }

  return <Box sx={{ p: 1, Width: '100%', minHeight: 200 }}>
    {/* form with three textboxes */}
    <Typography variant='h6'>{props.value?'Edit':'Add'} Stat Type</Typography>
    <Divider />
    {usersQuery.isLoading || datakeysQuery.isLoading ? <LinearProgress /> : null}
    <Grid container spacing={1} sx={{ mt: 1 }}>
      <Grid item xs={6}>
        <Stack spacing={1} sx={{ mt: 1 }} direction={'column'}>
          <Select multiple
            label="Additional Data Keys"
            value={statDataKeys}
            onChange={handleStatDataKeysChange} >
            {allkeys.map((d:any)=><MenuItem value={d.key}>{d.key}</MenuItem>)}
          </Select>
          <hr/>
          <TextField id="stat-group-input"
            fullWidth size="small"
            label="Stat Group"
            defaultValue="people"
            value={statGroup}
            onChange={handleStatGroupChange} />
          <TextField id="stat-name-input"
            fullWidth size="small"
            label="Name"
            defaultValue="NewStat"
            value={statName}
            onChange={handleStatNameChange} />
          <TextField id="stat-type-input"
            fullWidth size="small"
            label="type"
            defaultValue="NewStat"
            value={statType}
            onChange={handleStatTypeChange} />
          <TextField id="stat-exp-input"
            fullWidth size="small"
            label="Expression"
            multiline
            rows={2}
            value={statExp}
            onChange={handleStatExpChange} />
          <TextField id="stat-filter-input"
              fullWidth size="small"
              label="Filter"
              defaultValue="!blank"
              value={statFilter}
              onChange={handleStatFilterChange} />
          <Select
            label="Aggregation"
            input={<OutlinedInput label="Aggregation" />}
            value={statAgg||'count'}
            onChange={handleStatAggChange} >
            <MenuItem value={'count'}>Count</MenuItem>
            <MenuItem value={'sum'}>Sum</MenuItem>
            <MenuItem value={'avg'}>Avg</MenuItem>
            <MenuItem value={'min'}>Min</MenuItem>
            <MenuItem value={'max'}>Max</MenuItem>
            <MenuItem value={'percent'}>Percent</MenuItem>
            <MenuItem value={'distinct'}>Distinct</MenuItem>
            <MenuItem value={'group-count'}>Group(Count)</MenuItem>
          </Select>
          <TextField fullWidth size="small"
            id="stat-desc-input"
            label="Description"
            defaultValue={''}
            multiline
            rows={3}
            value={statDesc}
            onChange={handleStatDescChange} />
          <Divider sx={{my:1}}/>
          <Row spacing={1} sx={{ justifyContent:'flex-end' }}>
            <Button onClick={updateSample} color='inherit'>Preview</Button>
            <Button onClick={onSubmit}>Save</Button>
          </Row>
        </Stack>
      </Grid>
      <Grid item xs={6}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="statistics tabs" sx={{mx:1}}>
          <Tab label="info" {...a11yProps('info', 0)} />
          <Tab label="sample" {...a11yProps('sample', 1)} />
        </Tabs>
        <TabPanel value={tabValue} index={0} idprefix={'info'}>
          <ButtonPopover buttonContent={'Fields'}>
            <Box sx={{p:1}}>
              <Typography variant='h6'>Fields</Typography>
              <hr/>
              <Box>
                {fieldList.map(f=><Grid container sx={{p:1}}>
                  <Grid item xs={6}>{f.name}</Grid>
                  <Grid item xs={6}><strong>{f.expression}</strong></Grid>
                </Grid>)}
              </Box>
            </Box>
          </ButtonPopover>
          <Typography variant='h6'>Computed Value</Typography>
          <Typography paragraph>
            {JSON.stringify(computedValues)}
          </Typography>
          <Typography variant='h6'>Stat Widget</Typography>
          {
            statType==='number'?<NumberStatWidget value={computedValues?.value||0} title={statName} />:(
            statType==='pie'?<PieStatWidget value={computedValues?.value||[]} title={statName} />:(
            statType==='percent'?<PercentStatWidget value={Math.trunc((computedValues?.value||0)*1000/10)} title={statName} />:(
            null
            )))
          }
        </TabPanel>
        <TabPanel value={tabValue} index={1} idprefix={'sample'}>
          <Row></Row>
          <Box className="ag-theme-alpine" sx={gridStyle}>
            {/* <UserGrid users={users} datakeys={allkeys}/> */}
            <AgGridReact rowData={rowData} columnDefs={columnDefs} />
          </Box>
        </TabPanel>
      </Grid>
    </Grid>
  </Box>;
}

