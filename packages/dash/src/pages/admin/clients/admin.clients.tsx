import { useCallback, useEffect, useMemo, useRef, useState} from 'react';
import { getUserName, IClient, IUser } from 'sharedtypes';
import { Box, Button, Chip, FormControl, IconButton, InputLabel, Paper, Select, SelectChangeEvent, Stack, Typography } from '@mui/material';
import { AgGridReact } from 'ag-grid-react';

import 'ag-grid-enterprise';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { ColDef, ColGroupDef, ICellEditorParams, ICellRendererParams, SelectionChangedEvent, ValueFormatterParams, ValueSetterParams } from 'ag-grid-community';
import { appstateDispatch } from '@/hooks/useAppState';
import { useLocation, useNavigate } from 'react-router-dom';
import { useClients } from '@/api/client';
import useAxiosPrivate from '@/hooks/useAxiosPrivate';
import { checkboxSelection, headerCheckboxSelection } from '@/components/checkboxSelection';
import { useAllUsers } from '@/api/users';


/* eslint-disable-next-line */
export interface AdminClientsProps {}

export function AdminClients(props: AdminClientsProps) {
  const {data: allUsers} = useAllUsers();
  const location = useLocation();
  const navigate = useNavigate();
  const axios = useAxiosPrivate();
  const {data: clients, isLoading, mutation, invalidateCache} = useClients();
  const [selectedClients, setSelectedClients] = useState<IClient[]>([]);
  const gridStyle = useMemo(() => ({ height: '100%', width: '100%' }), []);
  const gridRef = useRef<AgGridReact<IClient>>(null);
  const [columnDefs] = useState< Array<ColDef<IClient> | ColGroupDef<IClient>> >([
    {
      field: 'name', floatingFilter: false, flex:0, editable: true,pinned: true,
      checkboxSelection: checkboxSelection,
      headerCheckboxSelection: headerCheckboxSelection,
    },
    {
      field: 'region', floatingFilter: false, flex:0, editable: true,
      cellEditor: 'agRichSelectCellEditor', cellEditorPopup: true, cellEditorPopupPosition: 'over',
      cellEditorParams: {
        values: ['NA', 'Intl'],
        cellHeight: 30,
      },
    },
    // {
    //   field: 'Admins', valueGetter:'data.admins', floatingFilter: false, flex:0, colId: 'admins',
    //   valueFormatter: (params: ValueFormatterParams<IClient, IUser[]>) => {
    //     return (params.value||[]).map(getUserName).join(', ');
    //   }
    // },

    // {
    //   headerName: 'Leads',
    //   flex: 1,
    //   children: [
    //     {
    //       field: 'Business Lead', valueGetter:'data.business_lead', floatingFilter: false, flex:0, colId: 'business_lead',
    //       cellRenderer: UserRenderer, editable: true,
    //       valueFormatter: (params: ValueFormatterParams<IClient, IUser>) => { return params.value?.email},
    //       valueSetter: (params: ValueSetterParams<IClient>) => {
    //         console.log(params);
    //         if (params.data) {
    //           params.data.business_lead = params.newValue as IUser;
    //           mutation.mutate(params.data);
    //         }
    //         return true;
    //       },
    //     },
    //     {
    //       field: 'Client Executive', valueGetter:'data.client_executive', floatingFilter: false, flex:0, colId: 'client_executive',
    //       cellRenderer: UserRenderer,
    //     },
    //     {
    //       field: 'Engagement Lead', valueGetter:'data.engagement_lead', floatingFilter: false, flex:0, colId: 'engagement_lead',
    //       cellRenderer: UserRenderer,
    //     },
    //     {
    //       field: 'Engineering Leads', valueGetter:'data.engineering_leads', floatingFilter: false, flex:0, colId: 'engineering_leads',
    //       cellRenderer: UserListRenderer,
    //     },
    //     {
    //       field: 'Product Leads', valueGetter:'data.product_leads', floatingFilter: false, flex:0, colId: 'engineering_leads',
    //       valueFormatter: (params: ValueFormatterParams<IClient, IUser[]>) => {
    //         return (params.value||[]).map(getUserName).join(', ');
    //       }
    //     },
    //   ],
    // },
  ]);
  const autoGroupColumnDef = useMemo(() => {
    return {
      minWidth: 200,
    };
  }, []);

  useEffect(() => {
    appstateDispatch({type:'title', data:'Clients (Admin) - PSNext'});
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
    const data : IClient = event.data;
    mutation.mutate(data, {
      onSuccess: ()=>invalidateCache(),
      onError: console.error,
    });
  }, [mutation, invalidateCache]);

  const onDeleteSelected = useCallback(async ()=>{
    if (selectedClients.length===0) return;
    const res = await axios.delete(`/api/clients?ids=${selectedClients.map(p=>`${p.id}`).join(',')}`);
    if (res.status===200) {
      invalidateCache();
    } else {
      console.error(res.statusText);
    }
  }, [selectedClients, invalidateCache])
  return (
    <Box sx={{p:1}}>
      <Button variant='outlined' disabled={selectedClients.length===0} onClick={onDeleteSelected}>Delete Selected</Button>
      <Box className="ag-theme-alpine" sx={{height: '70vh', width: '100%'}}>
        <AgGridReact<IClient> ref={gridRef}
            rowData={[...clients||[],{id:-1, name:'', type:'client', team:[]}]}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            rowSelection={'multiple'}
            suppressRowClickSelection={true}
            onSelectionChanged={(e:SelectionChangedEvent<IClient>)=>setSelectedClients(e.api.getSelectedRows())}
            editType={'fullRow'}
            onRowValueChanged={onRowValueChanged}
        >
        </AgGridReact>
      </Box>
    </Box>
  );
}

export default AdminClients;
