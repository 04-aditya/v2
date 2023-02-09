import React, { useEffect, useMemo, useRef, useState } from 'react';
import { IUser } from 'sharedtypes';
import BasicUserCard, { BasicUserCardTooltip } from '@/components/BasicUserCard';
import { appstateDispatch } from '@/hooks/useAppState';
import { Accordion, AccordionDetails, AccordionSummary, Box, Tab, Tabs, Typography } from '@mui/material';
import styles from './teams.module.scss';
import { useUser, useUserTeam } from '@/api/users';
import { useParams, useSearchParams } from 'react-router-dom';
import { Row } from '@/components/Row';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { useNavigate } from 'react-router-dom';
import { TabPanel, a11yProps } from '@/components/TabPanel';
import 'ag-grid-enterprise';
import { AgGridColumnGroupProps, AgGridColumnProps, AgGridReact } from 'ag-grid-react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';


/* eslint-disable-next-line */
export interface TeamsProps {}

export function Teams(props: TeamsProps) {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tabValue, setTabValue] = React.useState(0);
  const {data:user} = useUser(userId)
  const {data:teamMembers} = useUserTeam(userId);
  const [teamOptions, setTeamOptions] = React.useState<string[]>([]);
  const gridStyle = useMemo(() => ({ height: '100%', width: '100%' }), []);
  const gridRef = useRef<AgGridReact<IUser>>();
  const [columnDefs] = useState([
    { field: 'csid', enableRowGroup: false, tooltipField: 'csid',},
    { field: 'email', enableRowGroup: false, tooltipField: 'email', },
    { field: 'name', valueGetter: 'data.first_name + " " + data.last_name', enableRowGroup: false, colId: 'name', tooltipField: 'first_name', },
    { field: 'title', valueGetter:'data.business_title', enableRowGroup: true, colId: 'title', tooltipField: 'business_title', },
    { field: 'Career Stage', valueGetter:'data.career_stage', enableRowGroup: true, colId: 'career_stage', tooltipField: 'career_stage', },
    { field: 'Supervisor', valueGetter:'data.supervisor_name', enableRowGroup: true, colId: 'supervisor_name', tooltipField: 'supervisor_name', },
    { field: 'Current Region', valueGetter:'data.current_region', enableRowGroup: true, colId: 'current_region', tooltipField: 'current_region', },
    { field: 'account', enableRowGroup: true, tooltipField: 'account', },
    { field: 'capability', enableRowGroup: true, tooltipField: 'capability', },
    { field: 'craft', enableRowGroup: true, tooltipField: 'craft', },
    { field: 'team', enableRowGroup: true, tooltipField: 'team', },
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 100,
      sortable: true,
      resizable: true,
      // make every column use 'text' filter by default
      filter: 'agTextColumnFilter',
      // enable floating filters by default
      floatingFilter: true,
      tooltipComponent: BasicUserCardTooltip,
    };
  }, []);
  const autoGroupColumnDef = useMemo(() => {
    return {
      minWidth: 200,
    };
  }, []);
  // possible options: 'never', 'always', 'onlyWhenGrouping'
  const rowGroupPanelShow = 'always';
  // display each row grouping in a separate group column
  const groupDisplayType = 'groupRows';

  const handleTeamOptions = (
    event: React.MouseEvent<HTMLElement>,
    newOptions: string[],
  ) => {
    event.stopPropagation();
    setTeamOptions(newOptions);
    console.log(newOptions);
  };
  useEffect(() => {
    appstateDispatch({type:'title', data:'Teams - PSNext'});
  }, []);
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  return (
    <Box sx={{p:1}}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleChange} aria-label="team tabs">
          <Tab label="People Data" {...a11yProps('Data', 0)} />
        </Tabs>
      </Box>
      <TabPanel value={tabValue} index={0} idprefix={'Data'}>
        <Row spacing={1}>
          <Box className="ag-theme-alpine" sx={{height: '75vh', width: '100%'}}>
            <AgGridReact ref={r => gridRef}
              rowData={teamMembers}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              autoGroupColumnDef={autoGroupColumnDef}
              animateRows={true}
              rowGroupPanelShow={rowGroupPanelShow}
              groupSelectsChildren={true}
              groupDisplayType={groupDisplayType}
              rowSelection={'multiple'}
              tooltipShowDelay={0}
              tooltipHideDelay={2000}
            ></AgGridReact>
          </Box>
        </Row>
      </TabPanel>
      {/* <Accordion elevation={0}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="team-content"
          id="team-header"
        >
          <Row spacing={1}>
            <Typography>Team</Typography>
            <ToggleButtonGroup size="small"
              value={teamOptions}
              onChange={handleTeamOptions}
              aria-label="team card options"
            >
              <ToggleButton value="stats" aria-label="stats">
                <DashboardIcon />
              </ToggleButton>
            </ToggleButtonGroup>
          </Row>
        </AccordionSummary>
        <AccordionDetails sx={{bgcolor:'transparent'}}>
          {teamMembers && teamOptions ? teamMembers.map((member:IUser) => <BasicUserCard
            key={member.id} elevation={0} sx={{mb:0.5}} size={'small'}
            options={teamOptions}
            onClick={(e) => { navigate(`/profile/${member.email}`); }}
            user={member}
          />) : null}
        </AccordionDetails>
      </Accordion> */}
    </Box>
  );
}

export default Teams;
