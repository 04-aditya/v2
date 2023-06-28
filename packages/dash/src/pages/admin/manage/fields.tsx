import * as React from 'react'
import { Box, Button, Divider, Paper, Typography } from '@mui/material'
import { PageHeader } from 'sharedui/components/PageHeader';
import { PageContainer } from 'sharedui/components/PageContainer';
import { useAllUserData, useAllDataKeys, useUser } from 'psnapi/users';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { IConfigItem, getUserName } from 'sharedtypes';
import { Row } from '@/components/RowColumn';
import useAxiosPrivate from 'psnapi/useAxiosPrivate';
import { ModuleRegistry } from '@ag-grid-community/core';
import AddOrUpdateConfig from './configeditor';

import { MasterDetailModule } from '@ag-grid-enterprise/master-detail';
import ButtonPopover from '@/components/ButtonPopover';
ModuleRegistry.registerModules([ MasterDetailModule ]);

const FieldDetailCellRenderer = ({ data }: ICellRendererParams) => {
  const gridStyle = React.useMemo(() => ({height:300, width: '100%'}), []);
  const {data: user} = useUser(data.userId);
  const {data: uploadedData} = useAllUserData(data.id);
  const colDefs: ColDef[] = React.useMemo(()=>{
    return [
      {field: 'userid', width:100,},
      {field: 'timestamp', cellRenderer: 'agDateCellRenderer',width:100},
      {field: 'value', valueFormatter: params => JSON.stringify(params.value),},
    ]
  }, [])
  const defColDef: ColDef = React.useMemo(()=>{
    return {
      resizable: true,
    }
  }, [])
  return <ButtonPopover buttonContent='show data'>
  <Paper sx={{p:1, minWidth:450, maxWidth:600, minHeight:350}}>
    {user && <div> <Typography variant='caption'>Upload by:&nbsp;<strong>{getUserName(user)}</strong></Typography></div>}
      <Box className="ag-theme-alpine" sx={gridStyle}>
        <AgGridReact headerHeight={28} rowHeight={28}
          defaultColDef={defColDef}
          columnDefs={colDefs}
          rowData={uploadedData||[]}
        />
      </Box>
  </Paper>
  </ButtonPopover>
}

export default function AdminDataFields() {
  const axios  = useAxiosPrivate();
  const {data: allkeys, mutation, invalidateCache} = useAllDataKeys();
  const [gridApi, setGridApi] = React.useState<any>(null);
  const [rowData, setRowData] = React.useState<any>(null);
  const [selectedRows, setSelectedRows] = React.useState<any>([]);
  const gridStyle = React.useMemo(() => ({height: '75vh', width: '100%'}), []);

  const coldef: ColDef[] = React.useMemo(() => {
    return [
      {field: 'id', editable: false, filter: 'agTextColumnFilter', checkboxSelection: true},
      { field: 'type', editable: true, filter: 'agTextColumnFilter'},
      { field: 'uploadedby', editable: true, filter: 'agTextColumnFilter'},
      { field: 'usergroups', editable: true, filter: 'agTextColumnFilter'},
      { field: 'key', editable: true, filter: 'agTextColumnFilter'},
      { header: 'data', valueGetter:params=>params.data,  editable: false, cellRenderer: FieldDetailCellRenderer,}
    ];
  },[]);
  React.useEffect(()=>{
    const rows: Array<any> = [];
    if (allkeys) {
      allkeys.forEach(k=>{
        const kparts = k.key.split(':');
        const prefix=kparts[0].split('-');
        rows.push({
          id:k.key,
          type:prefix[0],
          uploadedby:prefix[1]||'system',
          usergroups:prefix[2]||'all',
          key:kparts[1],
          config: k.config,
        })
      })
    }
    setRowData(rows);
  }, [allkeys])

  const onSelectionChanged = (event: any) => {
    console.log(event)
    console.log(event.api.getSelectedRows())
    setSelectedRows(event.api.getSelectedRows());
  }

  const onDelete = async () => {
    console.log('delete');
    try {
      const key = selectedRows[0].id;
      console.log('deleting the key', key);
      const res = await axios.delete(process.env['NX_API_URL']+'/api/admin/datakeys/'+key);
      //const res = await mutation.mutateAsync({key, newkey});
      console.log(res);
      invalidateCache();
    } catch( ex) {
      console.error(ex);
    }
  }

  const onSave = async () => {
    console.log('save');
    try {
      const key = selectedRows[0].id;
      const newkey = selectedRows[0].type+'-'
        +selectedRows[0].uploadedby+'-'
        +selectedRows[0].usergroups
        +':'+selectedRows[0].key;
      if (key!==newkey) {
        console.log('updating the key', key, newkey);
        const res = await mutation.mutateAsync({key, newkey});
        console.log(res);
        invalidateCache();
      }
    } catch( ex) {
      console.error(ex);
    }
  }

  const onUpdateConfig = (config:IConfigItem)=>{
    console.log(config);
  }

  return <PageContainer>
    <PageHeader title='Manage Data Fields' subtitle='This page is under construction.'/>
    <Divider sx={{my:1}}/>
    <Row sx={{mb:1}} spacing={1}>
      <Button size='small' variant='outlined' disabled={selectedRows.length===0} onClick={onSave}>save</Button>
      <Button size='small' variant='outlined' disabled={selectedRows.length===0} onClick={onDelete}>Delete</Button>
      {selectedRows[0]?<AddOrUpdateConfig label='Edit Config' value={selectedRows[0].config} onChange={onUpdateConfig}/>:null}
    </Row>
    <Box className="ag-theme-alpine" sx={gridStyle}>
      <AgGridReact
        columnDefs={coldef}
        rowData={rowData}
        rowSelection={'single'}
        onSelectionChanged={onSelectionChanged}
        // masterDetail={true}
        // detailCellRenderer={FieldDetailCellRenderer}
      />
    </Box>
  </PageContainer>;
}
