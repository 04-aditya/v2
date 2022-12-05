import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IPermission, IUserRole } from '@/../../shared/types/src';
import { Box, Button, Checkbox, Chip, FormControl, IconButton, InputLabel, ListItemText, MenuItem, OutlinedInput, Paper, Select, SelectChangeEvent, Stack, Typography } from '@mui/material';
import { AgGridColumnProps, AgGridReact } from 'ag-grid-react';
import 'ag-grid-enterprise';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { ColDef, GetDataPath, ICellRendererParams, SelectionChangedEvent } from 'ag-grid-community';
import { appstateDispatch } from '@/hooks/useAppState';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRoles } from '@/api/roles';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ButtonPopover from '@/components/ButtonPopover';
import { usePermissions } from '@/api/permissions';


/* eslint-disable-next-line */
export interface AdminRolesProps {}

const checkboxSelection = function (params:any) {
  // we put checkbox on the name if we are not doing grouping
  //return params.columnApi.getRowGroupColumns().length === 0;
  return !!params.data && params.data.id!==-1;
};

const headerCheckboxSelection = function (params:any) {
  // we put checkbox on the name if we are not doing grouping
  return params.columnApi.getRowGroupColumns().length === 0;
};

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};
const PermissionsRenderer = (params: ICellRendererParams) => {
  const {data: permissions=[]} = usePermissions();
  const [perms, setPerms] = useState<IPermission[]>(params.value||[]);

  const handleChange = (event: SelectChangeEvent<string[]>) => {
    const {
      target: { value },
    } = event;
    const vals = typeof value === 'string' ? value.split(',') : value;
    const np = permissions.filter(p=>vals.indexOf(p.name)!==-1);
    setPerms(np);
  };

  const handleClose = (event:unknown, reason:"backdropClick" | "escapeKeyDown") => {
    if (params.setValue) {
      params.setValue([...perms]);
    }
  }

  return (
  <Stack direction={'row'} spacing={0.5} alignItems='center' flexWrap={'wrap'}>
    <ButtonPopover icon={<AddCircleIcon/>} onClose={handleClose} color='primary'>
      <Paper sx={{minWidth:320}}>
        <FormControl sx={{ m: 1}} fullWidth>
          <InputLabel id="permissions-multiple-checkbox-label">Permission</InputLabel>
          <Select fullWidth
            labelId="permissions-multiple-checkbox-label"
            id="permissions-multiple-checkbox"
            multiple
            value={(perms||[]).map(p=>p.name)}
            onChange={handleChange}
            input={<OutlinedInput label="Permissions" />}
            renderValue={(selected) => selected.join(', ')}
            MenuProps={MenuProps}
          >
            {permissions.map((p) => (
              <MenuItem key={p.id} value={p.name}>
                <Checkbox checked={perms.findIndex(prem => prem.id === p.id) > -1} />
                <ListItemText primary={p.name} secondary={p.description} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>
    </ButtonPopover>
    {perms.map((p:IPermission)=><Chip key={p.id} size='small'  label={p.name}/> )}
  </Stack>
  );
}

export function AdminRoles(props: AdminRolesProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const {data: roles, mutation, invalidateCache, isLoading} = useRoles();
  const [selectedRoles, setSelectedRoles] = useState<IUserRole[]>([]);
  const gridRef = useRef<AgGridReact<IUserRole>>();
  const [columnDefs] = useState<ColDef[]>([
      { field: 'description', flex:1, editable: true},
      { field: 'permissions', flex:0, cellRenderer: PermissionsRenderer, editable: true},
  ]);

  useEffect(() => {
    appstateDispatch({type:'title', data:'Roles (Admin) - PSNext'});
  }, []);

  // DefaultColDef sets props common to all Columns
  const defaultColDef = useMemo<ColDef>(() =>{
    return {
      sortable: true,
      // make every column use 'text' filter by default
      File: 'agTextColumnFilter',
      // enable floating filters by default
      floatingFilter: true,
      // make columns resizable
      resizable: true,
    };
  }, []);

  const autoGroupColumnDef = useMemo<ColDef>(() => {
    return {
      headerName: 'name',
      minWidth: 300,
      editable: true,
      cellRendererParams: {
        suppressCount: true,
        checkbox: true,
      },
    };
  }, []);

  const onRowValueChanged = useCallback((event:any) => {
    const data = event.data;
    console.log(data);
    mutation.mutate({id: data.id, name: data.name, description: data.description, permissions:[]},{
      onSuccess: ()=>invalidateCache(),
      onError: console.error,
    });
  }, [mutation, invalidateCache]);

  const onCellValueChanged =  useCallback((e:any)=>{
    const role:any = {...e.data};
    if (role) {
      role[e.colDef.field] = e.newValue;
      mutation.mutate({id: role.id, name: role.name, description: role.description, permissions:role.permissions},{
        onSuccess: ()=>invalidateCache(),
        onError: console.error,
      });
    }
  }, [mutation, invalidateCache]);

  const getDataPath = useMemo<GetDataPath>(() => {
    return (data: any) => {
      return [data.name].concat((data.children||[]).map((c:any) => c.name));
    };
  }, []);

  return (
    <Box sx={{p:1}}>
      <Typography variant='h4'>Roles</Typography>
      <hr/>
      <Stack direction={'row'} justifyContent='space-between' sx={{py:1}}>
        <Button variant='outlined' disabled={selectedRoles.length===0} onClick={console.log} size='small'>Change Parent</Button>
        <Button variant='outlined' disabled={selectedRoles.length===0} onClick={console.log} size='small'>Delete Selected</Button>
      </Stack>
      <Box className="ag-theme-alpine" sx={{height: '70vh', width: '100%'}}>
        <AgGridReact ref={r => gridRef}
            getRowId={params => params.data.id}
            rowData={[...roles||[],{id:-1, name:''}]}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            autoGroupColumnDef={autoGroupColumnDef}
            treeData={true}
            animateRows={true}
            groupDefaultExpanded={-1}
            rowSelection={'multiple'}
            groupSelectsChildren={true}
            suppressRowClickSelection={true}
            getDataPath={getDataPath}
            editType={'fullRow'}
            onSelectionChanged={(e:SelectionChangedEvent<IUserRole>)=>setSelectedRoles(e.api.getSelectedRows())}
            onRowValueChanged={onRowValueChanged}
            onCellValueChanged={onCellValueChanged}
        >
        </AgGridReact>
      </Box>
    </Box>
  );
}

export default AdminRoles;
