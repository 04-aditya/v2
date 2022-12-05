import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IUser } from '@/../../shared/types/src';
import { Box, Button, Chip, IconButton, Typography } from '@mui/material';
import styles from './admin.users.module.scss';
import useAxiosPrivate from '@/hooks/useAxiosPrivate';
import 'ag-grid-enterprise';
import { AgGridColumnProps, AgGridReact } from 'ag-grid-react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import PivotTableUI from 'react-pivottable/PivotTableUI';
import 'react-pivottable/pivottable.css';
import TableRenderers from 'react-pivottable/TableRenderers';
import Plot from 'react-plotly.js';
import createPlotlyRenderers from 'react-pivottable/PlotlyRenderers';
import { SelectionChangedEvent } from 'ag-grid-community';
import { notificationDispatch, NotificationInfo } from '@/hooks/useNotificationState';
import { appstateDispatch } from '@/hooks/useAppState';
import { useLocation, useNavigate } from 'react-router-dom';

import AddCircleIcon from '@mui/icons-material/AddCircle';

// create Plotly renderers via dependency injection
const PlotlyRenderers = createPlotlyRenderers(Plot);

const ADMINAPI = '/api/admin';

/* eslint-disable-next-line */
export interface AdminUsersProps {}

const checkboxSelection = function (params:any) {
  // we put checkbox on the name if we are not doing grouping
  return params.columnApi.getRowGroupColumns().length === 0;
};

const headerCheckboxSelection = function (params:any) {
  // we put checkbox on the name if we are not doing grouping
  return params.columnApi.getRowGroupColumns().length === 0;
};

const RolesRenderer = (params:any) => {
  return (
      <>
          {params.value.map((r:any)=><Chip size='small'  label={r.name} color={r.name==='admin'?'error':'default'}/> )}
          <IconButton aria-label='add role' color='primary' >
            <AddCircleIcon/>
          </IconButton>
      </>
  );
}

export function AdminUsers(props: AdminUsersProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const axios = useAxiosPrivate();
  const [users, setUsers] = useState<Array<IUser>>([]);
  const [selectedUsers, setSelectedUsers] = useState<IUser[]>([]);
  const [pstate, setPState] = useState<any>({});
  const gridRef = useRef<AgGridReact<IUser>>();
  const [columnDefs] = useState<Array<AgGridColumnProps>>([
      {
        field: 'id', floatingFilter: false, flex:0,
        checkboxSelection: checkboxSelection,
        headerCheckboxSelection: headerCheckboxSelection,
      },
      { field: 'email', flex:1},
      { field: 'roles', cellRenderer: RolesRenderer}
  ]);

  useEffect(() => {
    appstateDispatch({type:'title', data:'Users (Admin) - PSNext'});
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

  useEffect(()=>{
    axios.get(`${ADMINAPI}/users`)
      .then(res=>res.data)
      .then(apiresponse=>{
        setUsers(apiresponse.data);
      })
      .catch(err=>{
        setUsers([]);
        if (err.response && err.response.status===403) {
          navigate('/login',{
            state:{from: location.pathname}
          });
          return;
        }
        console.error(err);
      })
  }, []);

  const refreshSelectedUsers = ()=>{
    axios.post(`${ADMINAPI}/refreshuser/pda`,{
        email: selectedUsers[0].email,
      }).then (ar => {
        const notification = new NotificationInfo('User Refresh', `Refreshing PDA data for user ${selectedUsers[0].email}...`, 'pending', true);
        notificationDispatch({type:'add', notification});
        //poll for completion
        const pollid = setInterval(()=>{
          axios.get(`/api/q/${ar.data.data}`)
            .then(res=>{
              if (res.status===200) {
                console.log(res.data);
                if (res.data.status==='done') {
                  clearInterval(pollid);
                  notification.busy = false;
                  notification.status = 'done';
                  notification.description = `Refreshed PDA data for user ${selectedUsers[0].email} with snapshot date: ${res.data.results.snapshot_date}`;
                  notificationDispatch({type:'update', notification})
                } else if (res.data.status==='error') {
                  clearInterval(pollid);
                  notification.busy = false;
                  notification.status = 'error';
                  notification.description = `error:${res.data.results.error}\n` + notification.description;
                  notificationDispatch({type:'update', notification})
                }
              }
            })
            .catch(ex=>{
              clearInterval(pollid);
              notification.busy=false;
              notification.status='error';
              notification.description='error:\n' + notification.description;
              notificationDispatch({type:'update', notification})
            })
        }, 1000)
      }).catch (ex => {
        console.error(ex);
      })
  };

  return (
    <Box sx={{p:1}}>
      <Typography variant='h4'>Users</Typography>
      <hr/>
      <Button variant='outlined' disabled={selectedUsers.length===0} onClick={refreshSelectedUsers}>Refresh Data</Button>
      <Box className="ag-theme-alpine" sx={{height: '75vh', width: '100%'}}>
        <AgGridReact ref={r => gridRef}
            rowData={users}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            groupSelectsChildren={true}
            rowSelection={'multiple'}
            pagination={true}
            paginationAutoPageSize={true}
            onSelectionChanged={(e:SelectionChangedEvent<IUser>)=>setSelectedUsers(e.api.getSelectedRows())}
        >
        </AgGridReact>
      </Box>

      <PivotTableUI
        data={users}
        onChange={(s:any)=>setPState(s)}
        renderers={Object.assign({}, TableRenderers, PlotlyRenderers)}
        {...pstate}
        />
      <hr/>
    </Box>
  );
}

export default AdminUsers;
