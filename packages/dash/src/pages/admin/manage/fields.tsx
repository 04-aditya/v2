import * as React from 'react'
import { Box, Button, Divider, Typography } from '@mui/material'
import { PageHeader } from 'sharedui/components/PageHeader';
import { PageContainer } from 'sharedui/components/PageContainer';
import { useAllUserData, useAllDataKeys, useUser } from 'psnapi/users';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-enterprise';
import BasicUserCard from '@/components/BasicUserCard';
import { getUserName } from '@/../../shared/types/src';
import { Row } from '@/components/RowColumn';
import useAxiosPrivate from 'psnapi/useAxiosPrivate';

const FieldDetailCellRenderer = ({ data }: ICellRendererParams) => {
  const gridStyle = React.useMemo(() => ({height:200, width: '100%'}), []);
  const {data: user} = useUser(data.userId);
  const {data: uploadedData} = useAllUserData(data.id);
  const colDefs: ColDef[] = React.useMemo(()=>{
    return [
      {field: 'userid',},
      {field: 'timestamp', cellRenderer: 'agDateCellRenderer'},
      {field: 'value', valueFormatter: params => JSON.stringify(params.value), flex:1,},
    ]
  }, [])
  const defColDef: ColDef = React.useMemo(()=>{
    return {
      resizable: true,
    }
  }, [])
  return <Box sx={{p:1}}>
    {user && <div> <Typography variant='caption'>Upload by:&nbsp;<strong>{getUserName(user)}</strong></Typography></div>}
      <Box className="ag-theme-alpine" sx={gridStyle}>
        <AgGridReact headerHeight={28} rowHeight={28}
          defaultColDef={defColDef}
          columnDefs={colDefs}
          rowData={uploadedData||[]}
        />
      </Box>
  </Box>
}

export default function AdminDataFields() {
  const {data: allkeys, mutation, invalidateCache} = useAllDataKeys();
  const [gridApi, setGridApi] = React.useState<any>(null);
  const [rowData, setRowData] = React.useState<any>(null);
  const [selectedRows, setSelectedRows] = React.useState<any>([]);
  const gridStyle = React.useMemo(() => ({height: '75vh', width: '100%'}), []);

  const coldef: ColDef[] = React.useMemo(() => {
    return [
      {field: 'id', editable: false, cellRenderer: 'agGroupCellRenderer', checkboxSelection: true},
      { field: 'type', editable: true, filter: 'agTextColumnFilter'},
      { field: 'uploadedby', editable: true, filter: 'agTextColumnFilter'},
      { field: 'usergroups', editable: true, filter: 'agTextColumnFilter'},
      { field: 'key', editable: true, filter: 'agTextColumnFilter'},
    ];
  },[]);
  React.useEffect(()=>{
    const rows: Array<any> = [];
    if (allkeys) {
      allkeys.forEach(k=>{
        const kparts = k.split(':');
        const prefix=kparts[0].split('-');
        rows.push({
          id:k,
          type:prefix[0],
          uploadedby:prefix[1]||'system',
          usergroups:prefix[2]||'all',
          key:kparts[1],
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

  return <PageContainer>
    <PageHeader title='Manage Data Fields' subtitle='This page is under construction.'/>
    <Divider sx={{my:1}}/>
    <Row sx={{mb:1}}>
      <Button size='small' variant='outlined' disabled={selectedRows.length===0} onClick={onSave}>save</Button>
    </Row>
    <Box className="ag-theme-alpine" sx={gridStyle}>
      <AgGridReact masterDetail={true}
        columnDefs={coldef}
        rowData={rowData}
        rowSelection={'single'}
        onSelectionChanged={onSelectionChanged}
        detailCellRenderer={FieldDetailCellRenderer}
      />
    </Box>
  </PageContainer>;
}
