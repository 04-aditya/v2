import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IUser } from 'sharedtypes';
import BasicUserCard, { BasicUserCardTooltip } from '@/components/BasicUserCard';
import { appstateDispatch } from '@/hooks/useAppState';
import { Accordion, AccordionDetails, AccordionSummary, Autocomplete, Box, FormControlLabel, FormGroup, Switch, Tab, Tabs, Typography } from '@mui/material';
import styles from './teams.module.scss';
import { useUser, useUserDataKeys, useUserGroups, useUserTeam } from '@/api/users';
import { useParams, useSearchParams } from 'react-router-dom';
import { Row } from '@/components/Row';
import AutocompleteCheckbox from '@/components/AutocompleteCheckbox';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useNavigate } from 'react-router-dom';
import { TabPanel, a11yProps } from '@/components/TabPanel';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import 'ag-grid-enterprise';
import { AgGridColumnGroupProps, AgGridColumnProps, AgGridReact } from 'ag-grid-react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { ColDef, GetContextMenuItemsParams, MenuItemDef, RowNode, SideBarDef } from 'ag-grid-enterprise';
import { displayNotification } from '@/hooks/useNotificationState';
import { FileUploadButton } from '@/components/FileUploadDialog';
import useAxiosPrivate from '@/hooks/useAxiosPrivate';
import { ColumnVisibleEvent } from 'ag-grid-community';

const createFlagImg = (flag:string) => {
  return <img width="15" height="10" src={`https://flagcdn.com/h20/${flag}.png`}/>;
};
const RegionRenderer = (props:any) => {
  const flags: any = {
    'IND': createFlagImg('in'),
    'NA': createFlagImg('us'),
    'EU': createFlagImg('eu'),
    'ME': createFlagImg('ae'), //uae
    // 'AP': '🌏',
  }
  return (
    <span>
      {flags[props.value]||'🌏 '}
      {props.value}
    </span>
  );
};

/* eslint-disable-next-line */
export interface TeamsProps {}

const standardColumns: ColDef<IUser>[] = [
  { field: 'csid', enableRowGroup: false, tooltipField: 'csid',},
  { field: 'email', enableRowGroup: false, tooltipField: 'email', },
  { field: 'name', valueGetter: 'data.first_name + " " + data.last_name', enableRowGroup: false, colId: 'name', tooltipField: 'first_name', tooltipComponent: BasicUserCardTooltip },
  { field: 'title', valueGetter:'data.business_title', enableRowGroup: true, colId: 'title', tooltipField: 'business_title', },
  { field: 'Career Stage', valueGetter:'data.career_stage', enableRowGroup: true, colId: 'career_stage', tooltipField: 'career_stage', filter: 'agSetColumnFilter'},
  { field: 'Supervisor', valueGetter:'data.supervisor_name', enableRowGroup: true, colId: 'supervisor_name', tooltipField: 'supervisor_name', },
  { field: 'Current Region', valueGetter:'data.current_region', enableRowGroup: true, colId: 'current_region', tooltipField: 'current_region', filter: 'agSetColumnFilter', cellRenderer: RegionRenderer, },
  { field: 'account', enableRowGroup: true, tooltipField: 'account', },
  { field: 'capability', enableRowGroup: true, tooltipField: 'capability', filter: 'agSetColumnFilter' },
  { field: 'craft', enableRowGroup: true, tooltipField: 'craft', filter: 'agSetColumnFilter'},
  { field: 'team', enableRowGroup: true, tooltipField: 'team', filter: 'agSetColumnFilter'},
];

export function Teams(props: TeamsProps) {
  const navigate = useNavigate();
  const { userId } = useParams();
  const {data:groups} = useUserGroups(userId);
  const {data:datakeys, invalidateCache:invalidateDatakeysCache} = useUserDataKeys();
  const [visibleDataKeys, setVisibleDataKeys] = useState<string[]>([]);

  const [searchParams, setSearchParams] = useSearchParams();
  const axios = useAxiosPrivate();
  const [tabValue, setTabValue] = React.useState(0);
  const {data:user} = useUser(userId)
  const [selectedUserGroups, setSelectedUserGroups] = React.useState<Array<{type: string, name: string, role: string}>>([]);
  const {data:teamMembers, isLoading} = useUserTeam(userId, visibleDataKeys, selectedUserGroups.map(g=>g.type+':'+g.name));
  const gridStyle = useMemo(() => ({ height: '100%', width: '100%' }), []);
  const gridRef = useRef<AgGridReact<IUser>>(null);
  const [directsOnly, setDirectsOnly] = React.useState(false);
  const [columnDefs, setColumnDefs] = useState<ColDef<IUser>[]>(standardColumns);
  // possible options: 'never', 'always', 'onlyWhenGrouping'
  const rowGroupPanelShow = 'always';
  // display each row grouping in a separate group column
  const groupDisplayType = 'groupRows';

  const defaultColDef: ColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 100,
      sortable: true,
      resizable: true,
      // make every column use 'text' filter by default
      filter: 'agTextColumnFilter',
      // enable floating filters by default
      floatingFilter: true,
      // tooltipComponent: BasicUserCardTooltip,
    };
  }, []);
  const autoGroupColumnDef = useMemo(() => {
    return {
      minWidth: 300,
      // headerName: 'orgHierarchy',
      // cellRendererParams: {
      //   suppressCount: true,
      // },
    };
  }, []);

  const getDataPath = useMemo(() => {
    return (data:any) => {
      return data.orgHierarchy;
    };
  }, []);

  const statusBar = {
    statusPanels: [
        {
          statusPanel: 'agTotalAndFilteredRowCountComponent',
          align: 'left',
        },
        {
          statusPanel: 'agAggregationComponent',
          align: 'right',
        }
    ]
  };

  const sideBar: SideBarDef = {
    toolPanels: [
        {
            id: 'columns',
            labelDefault: 'Columns',
            labelKey: 'columns',
            iconKey: 'columns',
            toolPanel: 'agColumnsToolPanel',
            minWidth: 225,
            maxWidth: 225,
            width: 225,
        },
        {
            id: 'filters',
            labelDefault: 'Filters',
            labelKey: 'filters',
            iconKey: 'filter',
            toolPanel: 'agFiltersToolPanel',
            minWidth: 180,
            maxWidth: 400,
            width: 250,
        }
    ],
    position: 'right',
  };

  const getContextMenuItems = useCallback((params:GetContextMenuItemsParams<IUser>) => {
    let menuItems : (string | MenuItemDef)[] = [
      "resetColumns", // Reset all columns. Not shown by default.
      "separator", // Separator. Shown by default.

      "autoSizeAll", // Auto-size all columns. Not shown by default.
      "expandAll", // When set, it's only shown if grouping by at least one column. Not shown by default.
      "contractAll", //Collapse all groups. When set, it's only shown if grouping by at least one column. Not shown by default.
      "separator", // Separator. Shown by default.

      "copy", // Copy selected value to clipboard. Shown by default.
      "copyWithHeaders", // Copy selected value to clipboard with headers. Shown by default.
      "copyWithGroupHeaders", // Copy selected value to clipboard with headers and header groups. Shown by default.
      // "paste", // Always disabled (see note in clipboard section). Always disabled. Shown by default.
      "separator", // Separator. Shown by default.

      "export", // Export sub menu (containing csvExport and excelExport). Shown by default.
      // "csvExport", // Export to CSV using all default export values. Shown by default.
      // "excelExport", // Export to Excel (.xlsx) using all default export values. Shown by default.
      // "chartRange", // Chart a range of selected cells. Only shown if charting is enabled.
    ];
    console.log(params);
    if (params.node && params.node.group) {
      menuItems=[{
        // custom item
        name: `Email ${params.node.allChildrenCount} people in this group`,
        action: () => {
          if (!params.node) return;
          const emails = params.node.allLeafChildren.map((node:RowNode<IUser>) => node.data?.email).join(';');
          window.open(`mailto://${emails}`);
        },
        icon: "<img src='/assets/icons8-mail-24.png' width='16'/>",
      }, ...menuItems];
    } else {
      if (params.value) {
        let vmenuItems: (string|MenuItemDef[])=[];

        if (params.node) {
          vmenuItems = [{
            name: `Open Dashboard for ${params.node.data?.first_name+' '+params.node.data?.last_name}`,
            action: () => {
              if (params.node?.data)
                navigate(`/dashboard/${params.node.data.email}`)
            },
            icon: "<img src='assets/icons8-dashboard-layout-48.png' width='16'/>",
          }];
        }
        if (params.column?.getColId()==='email') {
          vmenuItems=[{
            // custom item
            name: 'Email: ' + params.value,
            action: () => {
              window.open(`mailto://${params.value}`);
            },
            icon: "<img src='assets/icons8-mail-24.png' width='16'/>",
          }, ...vmenuItems];
        } else {
          console.log(params.column);
          vmenuItems = [...vmenuItems, {
            name: `Filter by ${params.value}`,
            action : () => {
              if (!gridRef.current || !params.column) return;
              const instance = gridRef.current.api.getFilterInstance(params.column.getColId());
              if ( params.column.getColDef().filter==="agSetColumnFilter") {
                instance?.setModel({
                  values:[params.value]
                })
              }
              else {
                instance?.setModel({
                  type: 'equals',
                  filter: params.value,
                });
              }
              gridRef.current.api.onFilterChanged();
            },
          }];
        }
        menuItems=[...vmenuItems, ...menuItems];
      }
    }
    return menuItems;
  }, []);

  const handleTeamOptions = (
    event: React.SyntheticEvent,
    newOptions: Array<{type: string, name: string, role: string}>,
  ) => {
    console.log(newOptions);
    setSelectedUserGroups(newOptions);
  };

  useEffect(() => {
    if (user) {
      appstateDispatch({type:'title', data:`${user.first_name} ${user.last_name} - teams`});
    } else appstateDispatch({type:'title', data:'Teams - PSNext'});
  }, [user]);
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  useEffect(() => {
    if (!datakeys)
      return setColumnDefs(standardColumns);

    const coldefs = [...standardColumns];
    for(const key of datakeys) {
      coldefs.push({field: key, valueGetter: params => {
        if (!params.data) return null;
        if (!params.data.custom_details) return null;
        const kpi = params.data.custom_details[`${key}`];
        if (!kpi) return null;
        return kpi.value;
      },
      enableRowGroup: true, colId: `details-${key}`, initialHide: true });
    }
    setColumnDefs(coldefs);
  },[datakeys]);

  const onColumnVisible = (event: ColumnVisibleEvent<IUser>) => {
    console.log(event);
    if (event.visible && event.column) {
      if (event.column.getColId().startsWith('details-')) {
        // load data for the key if not loaded
        const key = event.column.getColId().substring(8);
        setVisibleDataKeys((prev) => {
          if (prev.includes(key)) return prev;
          return [...prev, key];
        });
      }
    }
  }


  const handleDirectsOnlyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDirectsOnly(event.target.checked);
    if (!gridRef.current) return;
    gridRef.current.api.setFilterModel({
      'supervisor_name': {
        filterType: 'text',
        type: 'contains',
        filter: event.target.checked?(user?.first_name+' '+user?.last_name):'',
      },
    });
  };


  const onUserDataUpload = async (files:File[], otherFields:{date:Date})=>{
    const formData = new FormData();
    formData.append("file", files[0]);
    try {
      await axios.post(`/api/users/uploaddata`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      .then (ar => {
        displayNotification('User data upload',`Updating data for users from file ${files[0].name}.`, 'pending', {axios, ar})
          .then(() => invalidateDatakeysCache())
      })
      .catch (ex => {
        console.error(ex);
      })
    } catch (ex) {
      console.error(ex);
    }
  }

  return (
    <Box sx={{p:1}}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleChange} aria-label="team tabs">
          <Tab label="People Data" {...a11yProps('Data', 0)} />
        </Tabs>
      </Box>
      <TabPanel value={tabValue} index={0} idprefix={'Data'}>
        <Row spacing={1}>
          <AutocompleteCheckbox options={groups||[]} getOptionLabel={g=>g.name} value={selectedUserGroups} onChange={handleTeamOptions} style={{width:300}} />
          <FormGroup>
            <FormControlLabel control={<Switch checked={directsOnly} onChange={handleDirectsOnlyChange} />} label="Directs Only" />
          </FormGroup>
          <FileUploadButton buttonContent={'Upload Data'} title='Upload Additional Data from excel' onUpload={onUserDataUpload} variant='outlined' />
        </Row>
        <Row spacing={1}>
          <Box className="ag-theme-alpine" sx={{height: '75vh', width: '100%'}}>
            <AgGridReact<IUser> ref={gridRef}
              statusBar={statusBar}
              rowData={teamMembers}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              autoGroupColumnDef={autoGroupColumnDef}

              animateRows={true}

              rowSelection={'multiple'}
              rowGroupPanelShow={rowGroupPanelShow}

              groupSelectsChildren={true}
              groupDisplayType={groupDisplayType}

              tooltipShowDelay={0}
              tooltipHideDelay={2000}
              sideBar={sideBar}

              enableRangeSelection={true}
              allowContextMenuWithControlKey={true}
              getContextMenuItems={getContextMenuItems}

              onColumnVisible={onColumnVisible}
              // treeData={true}
              // groupDefaultExpanded={-1}
              // getDataPath={getDataPath}

              //onRowClicked={(e:any) => { navigate(`/dashboard/${e.data.email}`); }}
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
