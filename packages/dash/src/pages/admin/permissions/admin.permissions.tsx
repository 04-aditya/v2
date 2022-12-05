import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IPermission } from '@/../../shared/types/src';
import { Box, Button, Chip, IconButton, Typography } from '@mui/material';
import { AgGridColumnProps, AgGridReact } from 'ag-grid-react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { SelectionChangedEvent } from 'ag-grid-community';
import { appstateDispatch } from '@/hooks/useAppState';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePermissions } from '@/api/permissions';
import useAxiosPrivate from '@/hooks/useAxiosPrivate';


/* eslint-disable-next-line */
export interface AdminPermsProps {}

const checkboxSelection = function (params:any) {
  // we put checkbox on the name if we are not doing grouping
  //return params.columnApi.getRowGroupColumns().length === 0;
  return !!params.data && params.data.id!==-1;
};

const headerCheckboxSelection = function (params:any) {
  // we put checkbox on the name if we are not doing grouping
  return params.columnApi.getRowGroupColumns().length === 0;
};


export function AdminPerms(props: AdminPermsProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const axios = useAxiosPrivate();
  const {data: permissions, mutation, invalidateCache} = usePermissions();
  const [selectedPerms, setSelectedPerms] = useState<IPermission[]>([]);
  const gridRef = useRef<AgGridReact<IPermission>>();
  const [columnDefs] = useState<Array<AgGridColumnProps>>([
      {
        field: 'name', floatingFilter: false, flex:0, editable: true,
        checkboxSelection: checkboxSelection,
        headerCheckboxSelection: headerCheckboxSelection,
      },
      { field: 'description', flex:1, editable: true},
  ]);

  useEffect(() => {
    appstateDispatch({type:'title', data:'Permissions (Admin) - PSNext'});
  }, []);

  // DefaultColDef sets props common to all Columns
  const defaultColDef = {
    sortable: true,
    // make every column use 'text' filter by default
    filter: 'agTextColumnFilter',
    // enable floating filters by default
    floatingFilter: true,
    // make columns resizable
    resizable: true,
  };

  const onRowValueChanged = useCallback((event:any) => {
    const data = event.data;
    mutation.mutate({id: data.id, name: data.name, description: data.description},{
      onSuccess: ()=>invalidateCache(),
      onError: console.error,
    });
  }, [mutation, invalidateCache]);

  const onDeleteSelected = useCallback(async ()=>{
    if (selectedPerms.length===0) return;
    const res = await axios.delete(`/api/permissions?ids=${selectedPerms.map(p=>`${p.id}`).join(',')}`);
    if (res.status===200) {
      invalidateCache();
    } else {
      console.error(res.statusText);
    }
  }, [selectedPerms, invalidateCache])
  return (
    <Box sx={{p:1}}>
      <Typography variant='h4'>Permissions</Typography>
      <hr/>
      <Button variant='outlined' disabled={selectedPerms.length===0} onClick={onDeleteSelected}>Delete Selected</Button>
      <Box className="ag-theme-alpine" sx={{height: '70vh', width: '100%'}}>
        <AgGridReact ref={r => gridRef}
            getRowId={params => params.data.id}
            rowData={[...permissions||[],{id:-1, name:''}]}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            rowSelection={'multiple'}
            pagination={true}
            paginationAutoPageSize={true}
            suppressRowClickSelection={true}
            onSelectionChanged={(e:SelectionChangedEvent<IPermission>)=>setSelectedPerms(e.api.getSelectedRows())}
            editType={'fullRow'}
            onRowValueChanged={onRowValueChanged}
        >
        </AgGridReact>
      </Box>
    </Box>
  );
}

export default AdminPerms;
