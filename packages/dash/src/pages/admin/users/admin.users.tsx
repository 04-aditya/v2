import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IUser } from '@/../../shared/types/src';
import { Box, Button, TextField, Typography } from '@mui/material';
import styles from './admin.users.module.scss';
import useAxiosPrivate from '@/hooks/useAxiosPrivate';
import 'ag-grid-enterprise';
import {AgGridReact } from 'ag-grid-react';

import PivotTableUI from 'react-pivottable/PivotTableUI';
import 'react-pivottable/pivottable.css';
import TableRenderers from 'react-pivottable/TableRenderers';
import Plot from 'react-plotly.js';
import createPlotlyRenderers from 'react-pivottable/PlotlyRenderers';
import { ColDef, ColGroupDef, SelectionChangedEvent } from 'ag-grid-community';
import { displayNotification } from '@/hooks/useNotificationState';
import { appstateDispatch } from '@/hooks/useAppState';
import { useLocation, useNavigate } from 'react-router-dom';

import { RolesRenderer } from '@/components/RolesRenderer';
import { Row } from '@/components/Row';
import { FileUploadButton } from '@/components/FileUploadDialog';
import { BasicUserCardTooltip } from '@/components/BasicUserCard';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { UserGrid } from '@/components/UserGrid';
import { useAllDataKeys } from '@/api/users';

// create Plotly renderers via dependency injection
const PlotlyRenderers = createPlotlyRenderers(Plot);

const ADMINAPI = '/api/admin';

export function AdminUsers() {
  const location = useLocation();
  const navigate = useNavigate();
  const axios = useAxiosPrivate();
  const {data: allcustomkeys} = useAllDataKeys();
  const [uploadDateValue, setUploadDateValue] = useState<Dayjs | null>(
    dayjs(new Date()),
  );
  const [users, setUsers] = useState<Array<IUser>>([]);
  const [selectedUsers, setSelectedUsers] = useState<IUser[]>([]);

  useEffect(() => {
    appstateDispatch({type:'title', data:'Users (Admin) - PSNext'});
  }, []);

  useEffect(()=>{
    (async ()=>{
      try {
        const ar = await axios.get(`${ADMINAPI}/users`)
        setUsers(ar.data.data);
      } catch(err: any) {
        setUsers([]);
        if (err.response?.status===403) {
          navigate('/login',{
            state:{from: location.pathname}
          });
          return;
        }
        console.error(err);
      }
    })();
  }, []);


  const handleUploadDateChange = (newValue: Dayjs | null) => {
    setUploadDateValue(newValue);
  };

  // const refreshSelectedUsers = ()=>{
  //   axios.post(`${ADMINAPI}/refreshuser/pda`,{
  //       email: selectedUsers[0].email,
  //     })
  //     .then (ar:any => displayNotification('User Refresh',`Refreshing PDA data for user ${selectedUsers[0].email}.`,'pending', {axios, ar}))
  //     .catch (ex:any => {
  //       console.error(ex);
  //     })
  // };

  const onPDAUpload = async (files:File[], otherFields:{date:Date})=>{
    const formData = new FormData();
    formData.append("file", files[0]);
    formData.append("snapshot_date", uploadDateValue?.toISOString().substring(0,10)+'T00:00:00.000Z');

    try {
      await axios.post(`${ADMINAPI}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      .then (ar => displayNotification('User data upload',`Updating user data from file ${files[0].name}.`, 'pending', {axios, ar}))
      .catch (ex => {
        console.error(ex);
      })
    } catch (ex) {
      console.error(ex);
    }
  }

  return (
    <PageContainer>
      <PageHeader title='Users' />
      <Row>
        {/* <Button variant='outlined' disabled={selectedUsers.length===0} onClick={refreshSelectedUsers}>Refresh Data</Button> */}
        <FileUploadButton title='Upload PDA excel' onUpload={onPDAUpload} variant='outlined'>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Date"
              value={uploadDateValue}
              onChange={handleUploadDateChange}
            />
          </LocalizationProvider>
        </FileUploadButton>
      </Row>
      <UserGrid users={users}/>
{/*
      <PivotTableUI
        data={users}
        onChange={(s:any)=>setPState(s)}
        renderers={Object.assign({}, TableRenderers, PlotlyRenderers)}
        {...pstate}
        />
      <hr/> */}
    </PageContainer>
  );
}

export default AdminUsers;
