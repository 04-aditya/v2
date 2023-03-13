import React, { useMemo, useState } from 'react';
import { IUser } from 'sharedtypes';
import { Box, Tab, Tabs } from '@mui/material';
import { useUser, useUserDataKeys, useUserTeam } from '@/api/users';
import { useParams } from 'react-router-dom';
import { Row } from '@/components/Row';
import { TabPanel, a11yProps } from '@/components/TabPanel';
import 'ag-grid-enterprise';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { FileUploadButton } from '@/components/FileUploadDialog';
import useAxiosPrivate from '@/hooks/useAxiosPrivate';
import { ColumnVisibleEvent } from 'ag-grid-community';
import { PageContainer } from '@/components/PageContainer';
import { GroupSelect } from '../../components/GroupSelect';
import { UserGrid } from '@/components/UserGrid';
import { displayNotification } from '@/hooks/useNotificationState';

/* eslint-disable-next-line */
export interface TeamsProps {}

export function Teams(_props: TeamsProps) {
  const axios = useAxiosPrivate();
  const { userId } = useParams();

  const [tabValue, setTabValue] = React.useState(0);
  const {data:user} = useUser(userId);
  const [selectedUserGroups, setSelectedUserGroups] = React.useState<Array<{type: string, name: string, role: string}>>([]);

  const {data: datakeys, invalidateCache: invalidateDatakeysCache} = useUserDataKeys();
  const [visibleDataKeys, setVisibleDataKeys] = useState<string[]>([]);

  const {data:teamMembers=[], isLoading} = useUserTeam(userId, visibleDataKeys, selectedUserGroups.map(g=>g.type+':'+g.name));
  const [pageError, setPageError] = React.useState<string|undefined>();
  // const [directsOnly, setDirectsOnly] = React.useState(false);

  const title = useMemo(() => {
    if (user) return `${user.first_name} ${user.last_name} - teams`;
    return 'Teams - PSNext';
  }, [user]);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const onColumnVisible = (event: ColumnVisibleEvent<IUser>) => {
    // console.log(event);
    if (!(event.visible && event.column)) return;
    if (!event.column.getColId().startsWith('details-')) return;

    // load data for the key if not loaded
    const key = event.column.getColId().substring(8);
    setVisibleDataKeys((prev) => {
      if (prev.includes(key)) return prev;
      return [...prev, key];
    });
  }

  const handleSelectedUserGroupsChange = (
    newvalue: Array<{type: string, name: string, role: string}>,
  ) => {
    setSelectedUserGroups(newvalue);
  };

  // const handleDirectsOnlyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   setDirectsOnly(event.target.checked);
  //   if (!gridRef.current) return;
  //   gridRef.current.api.setFilterModel({
  //     'supervisor_name': {
  //       filterType: 'text',
  //       type: 'contains',
  //       filter: event.target.checked?(user?.first_name+' '+user?.last_name):'',
  //     },
  //   });
  // };


  const onUserDataUpload = (files:File[], _otherFields:{date:Date}) => {
      try {
        setPageError(undefined);
        const formData = new FormData();
        formData.append("file", files[0]);
        axios.post(`/api/users/uploaddata`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        .then((ar) =>{
          console.log(ar.data);
          if (ar.status<400) {
            displayNotification('User data upload',`Updating data for users from file ${files[0].name}.`, 'pending', {axios, ar})
              .then(() => invalidateDatakeysCache())
              .catch(console.error)
          } else {
            console.error(ar.data);
            setPageError(`Unable to upload data.`);
          }
        })
        .catch ((ex) => {
          if (ex.response && ex.response.data && ex.response.data.message) {
            setPageError(`Unable to upload data. ${ex.response.data.message}`);
          } else {
            setPageError(`Unable to upload data.`);
          }
        });
      } catch (ex) {
        console.error(ex);
        setPageError(`Unable to upload data.`);
      }
    };

  return (
    <PageContainer title={title} error={pageError} isBusy={isLoading}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleChange} aria-label="team tabs">
          <Tab label="Team Pivot" {...a11yProps('Data', 0)} />
        </Tabs>
      </Box>
      <TabPanel value={tabValue} index={0} idprefix={'Data'}>
        <Row spacing={1} sx={{mb: 1}}>
          <GroupSelect userId={userId} value={selectedUserGroups} onChange={handleSelectedUserGroupsChange}/>
          {/* <FormGroup>
            <FormControlLabel control={<Switch checked={directsOnly} onChange={handleDirectsOnlyChange} />} label="Directs Only" />
          </FormGroup> */}
          <FileUploadButton buttonContent={'Upload Data'} title='Upload Additional Data from excel' onUpload={onUserDataUpload} variant='outlined' />
        </Row>
        <Row spacing={1}>
          <UserGrid users={teamMembers} custom_details={datakeys} onColumnVisible={onColumnVisible}/>
        </Row>
      </TabPanel>
  </PageContainer>);
}

export default Teams;
