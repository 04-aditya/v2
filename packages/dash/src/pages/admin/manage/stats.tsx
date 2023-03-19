import { Box, Button, Divider, FormControl, FormControlLabel, FormHelperText, Grid, Input, InputLabel, Tab, Tabs, TextField, Typography } from '@mui/material'
import * as React from 'react'
import { PageHeader } from '@/components/PageHeader';
import { PageContainer } from '@/components/PageContainer';
import { useStatTypes } from '@/api/stats';
import ButtonPopover from '@/components/ButtonPopover';
import { Row } from '@/components/Row';
import { IStatType } from 'sharedtypes';
import { Stack } from '@mui/system';
import { TabPanel, a11yProps } from '@/components/TabPanel';
import * as jp from 'jsonpath';
import { useAllUsers } from '@/api/users';
import 'ag-grid-enterprise';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';

import evaluate from 'static-eval';
import * as esprima from 'esprima';

export default function AdminStats() {
  const {data: statTypes, invalidateCache, mutation} = useStatTypes();
  const [stat, setStat] = React.useState<IStatType>({} as IStatType);

  const handleOnStatChange = (newStat:IStatType) => {
    mutation.mutateAsync(newStat)
      .then(()=>{
        setStat({} as IStatType);
        invalidateCache();
      })
      .catch(console.error);
  }

  return <PageContainer>
    <PageHeader title='Manage Stat Types' subtitle='This page is under construction' />
    <Row spacing={1}>
      <ButtonPopover buttonContent='Add' variant='contained'>
        <StatEditor value={stat} onChange={handleOnStatChange}/>
      </ButtonPopover>
    </Row>
  </PageContainer>
}
function StatEditor(props: {value:IStatType, onChange:(newValue:IStatType)=>void}) {
  const {data:users, isLoading} = useAllUsers();
  const [tabValue, setTabValue] = React.useState(0);
  const [rowData, setRowData] = React.useState<Array<any>>([]);
  const gridStyle = React.useMemo(() => ({height: 300, width: '100%'}), []);
  const [columnDefs, setColumnDefs] = React.useState<ColDef[]>([]);

  const [fieldList, setFieldList] = React.useState<string>('');
  const [statName, setStatName] = React.useState<string>('');
  const [statType, setStatType] = React.useState<string>('');
  const [statExp, setStatExp] = React.useState<string>('*');
  const [statDesc, setStatDesc] = React.useState<string>();

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
    setStatName(props.value.name);
    setStatType(props.value.type);
    setStatExp(props.value.expression);
    setStatDesc(props.value.description);
  }, [props.value]);

  React.useEffect(()=>{
    if (isLoading || !users || statExp==='') return;
    setFieldList(Object.keys(users[0]).join(', '));


    try {
      const colDefs = new Array<ColDef>();
      // const ast = esprima.parseScript(statExp).body[0].expression;
      // evaluate(ast,{})
      const data = jp.query(users, '*');
      const datatype = typeof data[0];
      console.log(datatype);
      if (datatype==='string' || datatype==='number') {
        colDefs.push({valueGetter: `data`, headerName: statExp});
      } else {
        const keys = Object.keys(data[0])
        console.log(keys);
        keys.forEach(key => {
          if (key!=='custom_details') {
            colDefs.push({field : key})
            return;
          }
          const customDetails: any = data[0].custom_details;
          const customKeys = Object.keys(customDetails);
          customKeys.forEach(customKey => {
            colDefs.push({field : `custom_details.${customKey}`})
          });
        });
      }
      setColumnDefs(colDefs);

      // add the data to the grid
      setRowData(data);
    } catch (ex) {
      console.error(ex);
    }
  }, [users, isLoading, statExp]);

  const handleStatNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStatName(event.target.value);
  }
  const handleStatTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStatType(event.target.value);
  }
  const handleStatExpChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStatExp(event.target.value);
  }
  const handleStatDescChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStatDesc(event.target.value);
  }
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const onSubmit = () => {
    props.onChange({
      name: statName,
      type: statType,
      expression: statExp,
      description: statDesc
    })
  }

  return <Box sx={{ p: 1, minWidth: 400, minHeight: 200 }}>
    {/* form with three textboxes */}
    <Typography variant='h6'>Add Stat Type</Typography>
    <Divider />
    <Grid container spacing={1} sx={{ mt: 1 }}>
      <Grid item xs={6}>
        <Stack spacing={1} sx={{ mt: 1 }} direction={'column'}>
          <TextField fullWidth size="small"
            id="stat-name-input"
            label="Name"
            defaultValue="NewStat"
            value={statName}
            onChange={handleStatNameChange} />
          <TextField fullWidth size="small"
            id="stat-type-input"
            label="type"
            defaultValue="NewStat"
            value={statType}
            onChange={handleStatTypeChange} />
          <TextField fullWidth size="small"
            id="stat-exp-input"
            label="Expression"
            multiline
            rows={3}
            defaultValue="*"
            value={statExp}
            onChange={handleStatExpChange} />
          <TextField fullWidth size="small"
            id="stat-desc-input"
            label="Description"
            multiline
            rows={3}
            value={statDesc}
            onChange={handleStatDescChange} />
            <Divider sx={{my:1}}/>
            <Row spacing={1} sx={{ justifyContent:'flex-end' }}>
              <Button onClick={onSubmit}>Add</Button>
            </Row>
        </Stack>
      </Grid>
      <Grid item xs={6}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="statistics tabs" sx={{mx:1}}>
          <Tab label="info" {...a11yProps('info', 0)} />
          <Tab label="sample" {...a11yProps('sample', 1)} />
        </Tabs>
        <TabPanel value={tabValue} index={0} idprefix={'info'}>
          <Typography variant='h6'>Fields</Typography>
          <Typography paragraph>
            {fieldList}
          </Typography>
        </TabPanel>
        <TabPanel value={tabValue} index={1} idprefix={'sample'}>
          <Typography paragraph>
            {fieldList}
          </Typography>
          <Box className="ag-theme-alpine" sx={gridStyle}>
            <AgGridReact
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              autoGroupColumnDef={autoGroupColumnDef}
            />
          </Box>
        </TabPanel>
      </Grid>
    </Grid>
  </Box>;
}

