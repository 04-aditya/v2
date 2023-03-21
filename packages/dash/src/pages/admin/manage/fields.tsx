import * as React from 'react'
import { Box, Divider, Typography } from '@mui/material'
import { PageHeader } from '@/components/PageHeader';
import { PageContainer } from '@/components/PageContainer';
import { useAllCustomData, useAllDataKeys, useUser } from '@/api/users';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-enterprise';
import BasicUserCard from '@/components/BasicUserCard';
import { getUserName } from '@/../../shared/types/src';

const FieldDetailCellRenderer = ({ data }: ICellRendererParams) => {
  const gridStyle = React.useMemo(() => ({height:200, width: '100%'}), []);
  const {data: user} = useUser(data.userId);
  const {data: uploadedData} = useAllCustomData(data.id);
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
  const {data: allkeys} = useAllDataKeys();
  const [gridApi, setGridApi] = React.useState<any>(null);
  const [rowData, setRowData] = React.useState<any>(null);
  const [selectedRows, setSelectedRows] = React.useState<any>();
  const gridStyle = React.useMemo(() => ({height: '75vh', width: '100%'}), []);

  const coldef: ColDef[] = React.useMemo(() => {
    return [
      {field: 'id', editable: false, cellRenderer: 'agGroupCellRenderer'},
      { field: 'type', editable: true, filter: 'agTextColumnFilter'},
      { field: 'usergroup', editable: true, filter: 'agTextColumnFilter'},
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
          userId:prefix[1],
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

  return <PageContainer>
    <PageHeader title='Manage Data Fields' subtitle='This page is under construction.'/>
    <Divider sx={{mx:1}}/>
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
