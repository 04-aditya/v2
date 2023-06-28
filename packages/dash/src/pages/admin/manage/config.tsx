import * as React from 'react'
import { Box, Button, Divider, MenuItem, Input, Paper, Select, TextField, Typography } from '@mui/material'
import { PageHeader } from 'sharedui/components/PageHeader';
import { PageContainer } from 'sharedui/components/PageContainer';
import { useAllUserData, useAllDataKeys, useUser } from 'psnapi/users';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import BasicUserCard from '@/components/BasicUserCard';
import { APIResponse, IConfigItem, getUserName } from 'sharedtypes';
import { Row } from '@/components/RowColumn';
import useAxiosPrivate from 'psnapi/useAxiosPrivate';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AddOrUpdateConfig from './configeditor';

export default function AdminConfigItems() {
  const axios  = useAxiosPrivate();
  const [rowData, setRowData] = React.useState<any>(null);
  // Get QueryClient from the context
  const queryClient = useQueryClient()
  const { isLoading, error, data } = useQuery({
    queryKey: ['config'],
    queryFn: () => axios<APIResponse<IConfigItem[]>>('/api/admin/config').then(res => res.data.data),
  })
  const [gridApi, setGridApi] = React.useState<any>(null);
  const [selectedRows, setSelectedRows] = React.useState<any>([]);
  const gridStyle = React.useMemo(() => ({height: '75vh', width: '100%'}), []);

  const coldef: ColDef[] = React.useMemo(() => {
    return [
      {field: 'id', editable: false, cellRenderer: 'agGroupCellRenderer', checkboxSelection: true},
      { field: 'name', editable: true, filter: 'agTextColumnFilter'},
      { field: 'type', editable: true, filter: 'agTextColumnFilter'},
      { field: 'details', editable: true, filter: 'agTextColumnFilter', valueFormatter: (params: any) => JSON.stringify(params.value)},
    ];
  },[]);
  React.useEffect(()=>{
    const rows: Array<any> = [];
    if (data) {
      data.forEach((k:IConfigItem) => {
        rows.push(k)
      })
    }
    setRowData(rows);
  }, [data])


  if (isLoading) return 'Loading...'

  if (error) return 'An error has occurred: ' + (error as any).message;

  const onSelectionChanged = (event: any) => {
    console.log(event)
    console.log(event.api.getSelectedRows())
    setSelectedRows(event.api.getSelectedRows());
  }

  const onDelete = async () => {
    console.log('delete');
    try {
      // const key = selectedRows[0].id;
      // console.log('deleting the key', key);
      // const res = await axios.delete(process.env['NX_API_URL']+'/api/admin/datakeys/'+key);
      // //const res = await mutation.mutateAsync({key, newkey});
      // console.log(res);
      // invalidateCache();
    } catch( ex) {
      console.error(ex);
    }
  }

  const onSave = async () => {
    console.log('save');
    try {
      // const key = selectedRows[0].id;
      // const newkey = selectedRows[0].type+'-'
      //   +selectedRows[0].uploadedby+'-'
      //   +selectedRows[0].usergroups
      //   +':'+selectedRows[0].key;
      // if (key!==newkey) {
      //   console.log('updating the key', key, newkey);
      //   const res = await mutation.mutateAsync({key, newkey});
      //   console.log(res);
      //   invalidateCache();
      // }
    } catch( ex) {
      console.error(ex);
    }
  }

  const onAddOrUpdate = async () => {
    queryClient.invalidateQueries({ queryKey: ['config'] })
  }

  return <PageContainer>
    <PageHeader title='Manage Configuration' subtitle='This page is under construction.'/>
    <Divider sx={{my:1}}/>
    <Row sx={{mb:1}} spacing={1}>
      <Button size='small' variant='outlined' disabled={selectedRows.length===0} onClick={onSave}>save</Button>
      <Button size='small' variant='outlined' disabled={selectedRows.length===0} onClick={onDelete}>Delete</Button>
      <AddOrUpdateConfig value={selectedRows[0]} onChange={onAddOrUpdate}/>
    </Row>
    <Box className="ag-theme-alpine" sx={gridStyle}>
      <AgGridReact
        columnDefs={coldef}
        rowData={rowData}
        rowSelection={'single'}
        onSelectionChanged={onSelectionChanged}
      />
    </Box>
  </PageContainer>;
}
