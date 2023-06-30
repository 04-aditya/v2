import React from 'react';
import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { IConfigItem, IUser, IUserData } from "sharedtypes";
import { Box, IconButton, MenuItem, Select } from "@mui/material";
import { ColDef, ColumnVisibleEvent, SideBarDef, GetContextMenuItemsParams, MenuItemDef, ColGroupDef, IRowNode, IToolPanelParams } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useNavigate } from "react-router-dom";
import { BasicUserCardTooltip } from "./BasicUserCard";
import { RegionRenderer } from "./RegionRenderer";
import 'ag-grid-enterprise';
import { parseISO } from "date-fns";
import { Typography } from '@mui/material';
import { Stack } from '@mui/system';
import { Avatar } from '@mui/material';
import { Row } from './RowColumn';
import { Divider } from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import useAxiosPrivate from 'psnapi/useAxiosPrivate';

const DataPanel = (props: {usergroups?:string[]} & IToolPanelParams<IUser>) => {
  const {api, columnApi,usergroups=[] } = props;
  const axios = useAxiosPrivate();
  const [dataStore, setDataStore] = useState<Record<string, Record<string, IUserData[]>>>({});
  const [ranges, setRanges] = useState<Record<string,string>>({});
  const [aggTypes, setAggTypes] = useState<Record<string,string>>({});

  const onLoadData = (datakey: string) => {
    return async ()=>{
      try {
        console.log(props);
        const res = await axios.get(`/api/users/me/data?datakeys=${datakey}&minDate=2023-01-01&usergroups=${usergroups.join(',')}`);
        setDataStore(d => {
          const mappedData = res.data.data;
          console.log(res.data);
          const data = mappedData[datakey];
          console.log(data);
          if (!data) return d;
          api.forEachNode((node) => {
            const user = node.data;
            if (user?.data) {
              const userdata = data[user.id+''];
              if (userdata) {
                user.data[datakey] = userdata ? userdata.length : null;
                console.log(user.data[datakey]);
                node.setData({...user});
              }
            }
          });
          // if (data) {
          //   d.set(datakey, data);
          // } else {
          //   d.delete(datakey);
          // }
          // console.log(data);
          return {...d};
        });
      } catch (ex) {
        console.error(ex);
      }
    }
  }

  const onChangeDataRange = (key:string, range:string)=>{
    setRanges(ranges=>({...ranges, [key]:range}));
  }

  const onChangeAggType = (key:string, aggType:string)=>{
    setAggTypes(aggTypes=>({...aggTypes, [key]:aggType}));
  }

  return (
    <Box sx={{p:1}}>
      <Typography variant="h6">Data Panel</Typography>
      <Stack spacing={1} direction={'column'}>
      {(columnApi?.getColumns()||[]).map((col) => {
        const colId = col.getColId();
        if (!colId.startsWith('data-')) return null;
        const colDef = col.getColDef();
        const datakey = colId.replace('data-', '');
        const fparts = datakey.split(':');
        const uparts = fparts[0].split('-');
        const children = (colDef as ColGroupDef).children||[];
        return <Box key={colId}>
          <Row>
              <IconButton sx={{color: dataStore[colId.substring(5)] ?'primary':'inherit'}} aria-label="load data" size='small' onClick={onLoadData(colId.substring(5))}>
                <CloudDownloadIcon fontSize='small'/>
              </IconButton>
              <span className='ag-column-select-column-label'>{fparts[1]}</span>
              <Avatar alt="dataclass" sx={{width: 16, height: 16 , fontSize:12}}>{uparts[0][0]}</Avatar>
          </Row>
          <Row spacing={1}>
            <Select label='Range' variant='outlined' size='small'
              value={ranges[colId.substring(5)]||'last'}
              onChange={(e)=>onChangeDataRange(colId.substring(5), e.target.value)}>
              <MenuItem value="last">Last</MenuItem>
              <MenuItem value="current_month">Current Month</MenuItem>
              <MenuItem value="current_quarter">Current Quarter</MenuItem>
              <MenuItem value="current_halfyear">Current Half Year</MenuItem>
              <MenuItem value="current_year">Current Year</MenuItem>
            </Select>
            <Select label='aggregation' variant='outlined' size='small'
              value={aggTypes[colId.substring(5)]||'none'}
              onChange={(e)=>onChangeAggType(colId.substring(5), e.target.value)}>
              <MenuItem value="none">Last Value</MenuItem>
              <MenuItem value="count">Count</MenuItem>
              <MenuItem value="sum">Sum</MenuItem>
              <MenuItem value="min">Min</MenuItem>
              <MenuItem value="max">Max</MenuItem>
            </Select>
          </Row>
          {children?<Stack spacing={1} sx={{ml:2}}>
            {children.map((child:ColDef) => {
              return <>
                <Row key={child.colId}><span className='ag-column-select-column-label'>{child.headerName}</span></Row>
                <Select label='aggregation' size='small' value={aggTypes[colId.substring(5)+child.colId]||'none'} onChange={(e)=>onChangeAggType(colId.substring(5), e.target.value)} variant='standard'>
                  <MenuItem value="none">Last Value</MenuItem>
                  <MenuItem value="count">Count</MenuItem>
                  <MenuItem value="sum">Sum</MenuItem>
                  <MenuItem value="min">Min</MenuItem>
                  <MenuItem value="max">Max</MenuItem>
                </Select>
              </>
            })}
          </Stack>:null}
          <Divider sx={{my:1}}/>
        </Box>
      })}
      </Stack>
    </Box>
  );
}
const standardColumns: ColDef[] = [
  { field: 'csid', enableRowGroup: false, tooltipField: 'csid', headerTooltip:'Career Settings ID'},
  { field: 'email', enableRowGroup: false, tooltipField: 'email', },
  { field: 'name', valueGetter: 'data.first_name + " " + data.last_name', enableRowGroup: false, colId: 'name', tooltipField: 'first_name', tooltipComponent: BasicUserCardTooltip },
  { field: 'title', valueGetter:'data.business_title', enableRowGroup: true, colId: 'title', tooltipField: 'business_title', },
  { field: 'Career Stage', valueGetter:'data.career_stage', enableRowGroup: true, colId: 'career_stage', tooltipField: 'career_stage', filter: 'agSetColumnFilter'},
  { field: 'Supervisor', valueGetter:'data.supervisor_name', enableRowGroup: true, colId: 'supervisor_name', tooltipField: 'supervisor_name', },
  { field: 'Current Region', valueGetter:'data.current_region', enableRowGroup: true, colId: 'current_region', tooltipField: 'current_region', filter: 'agSetColumnFilter', cellRenderer: RegionRenderer, },
  { field: 'account', enableRowGroup: true, tooltipField: 'account', headerTooltip: 'Client / Account Name' },
  { field: 'capability', enableRowGroup: true, tooltipField: 'capability', filter: 'agSetColumnFilter', headerTooltip:'hrms2'},
  { field: 'craft', enableRowGroup: true, tooltipField: 'craft', filter: 'agSetColumnFilter', headerTooltip:'hrms3'},
  { field: 'team', enableRowGroup: true, tooltipField: 'team', filter: 'agSetColumnFilter', headerName: 'Industry', headerTooltip: 'Industry/Team' },
];

export interface UserGridProps {
  users: IUser[];
  onColumnVisible?: (event: ColumnVisibleEvent<IUser>) => void;
  datakeys?: {key:string, config:IConfigItem}[];
  usergroups?: string[];
}

export function UserGrid(props: UserGridProps) {
  const navigate = useNavigate();
  const gridStyle = useMemo(() => ({height: '75vh', width: '100%'}), []);
  const gridRef = useRef<AgGridReact<IUser>>(null);
  const [columnDefs, setColumnDefs] = useState<(ColDef<IUser> | ColGroupDef)[]>(standardColumns);
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
  const columnTypes = useMemo<{[key: string]: ColDef;}>(() => {
    return {
      numberColumn: { width: 130, filter: 'agNumberColumnFilter' },
      nonEditableColumn: { editable: false },
      dateColumn: {
        // specify we want to use the date filter
        filter: 'agDateColumnFilter',
        // add extra parameters for the date filter
        filterParams: {
          // provide comparator function
          comparator: (filterLocalDateAtMidnight: Date, cellValue: string) => {
            // In the example application, dates are stored as dd/mm/yyyy
            // We create a Date object for comparison against the filter date
            const dateParts = cellValue.split('/');
            const day = Number(dateParts[0]);
            const month = Number(dateParts[1]) - 1;
            const year = Number(dateParts[2]);
            const cellDate = new Date(year, month, day);
            // Now that both parameters are Date objects, we can compare
            if (cellDate < filterLocalDateAtMidnight) {
              return -1;
            } else if (cellDate > filterLocalDateAtMidnight) {
              return 1;
            } else {
              return 0;
            }
          },
        },
      },
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
        },
        {
            id: 'data',
            labelDefault: 'Data',
            labelKey: 'aggregation',
            iconKey: 'menuValue',
            toolPanel: DataPanel,
            toolPanelParams: {usergroups: props.usergroups},
            minWidth: 180,
            maxWidth: 400,
            width: 250,
        },
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
          const emails = params.node.allLeafChildren.map((value:IRowNode<IUser>) => value.data?.email).join(';');
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
  }, [navigate]);

  useEffect(() => {
    if (!props.datakeys)
      return setColumnDefs(standardColumns);

      (window as any).users = props.users;

    const coldefs = [...standardColumns];
    for(const datakey of props.datakeys) {
      const key = datakey.key;
      const fparts = key.split(':');
      const kparts: string[] = fparts[0].split('-');
      const headerName = `${fparts[1]} (${kparts[0]})`;
      const headerTooltip = (kparts[1]!=='' ? `uploaded by user ${kparts[1]}` : fparts[1]);
      const sample = props.users.find(u => u.data && u.data[key]);
      //console.log(sample);
      if (sample?.data && sample?.data[key]?.details) {
        const headerName = `${fparts[1]} (${kparts[0]}) - group`;
        const children: ColDef[] = [];
        children.push({
          field: `${fparts[1]}`,
          valueGetter: ({data:user}) => {
            if (!user) return null;
            if (!user.data) return null;
            const kpi = user.data[key];
            if (!kpi || !kpi.value) return '';
            return kpi.value;
          },
          enableRowGroup: true, colId: `subdata-${key}-value`
        });
        Object.keys(sample.data[key].details).forEach(k => {
          // const val:any = sample.custom_details?sample.custom_details[key].details[k]:undefined;
          const isdatetype = false; // k.toLowerCase().indexOf('date')!==-1;
          children.push({
            field: k,
            valueGetter: ({data:user}) => {
              if (!user) return null;
              if (!user.data) return null;
              const kpi = user.data[key];
              if (!kpi || !kpi.details[k]) return '';
              return isdatetype? parseISO(kpi.details[k]) : kpi.details[k];
            },
            type: isdatetype ? ['dateColumn', 'nonEditableColumn'] : ['nonEditableColumn'],
            enableRowGroup: true, colId: `subdata-${key}-${k}`
          });
        });
        coldefs.push({field: fparts[1], colId: `data-${key}`, initialHide: true,
          children, headerName, headerTooltip,
        } as ColGroupDef);
      } else {
        coldefs.push({field: fparts[1], colId: `data-${key}`, initialHide: true, enableRowGroup: true,
          valueGetter: ({data:user}) => {
            // console.log(user, key);
            if (!user) return null;
            if (!user.data) return null;
            const kpi = user.data[`${key}`];
            if (!kpi) return '';
            return kpi.value||kpi;
          },
          sortable: true, resizable: true,
          headerName, headerTooltip,
        });
      }
    }
    setColumnDefs(coldefs);
  },[props.datakeys, props.users]);

  const onColumnVisible = (event: ColumnVisibleEvent<IUser>) => {
    if (props.onColumnVisible) {
      props.onColumnVisible(event);
    }
  }

  return (
  <Box className="ag-theme-alpine" sx={gridStyle}>
    <AgGridReact<IUser> ref={gridRef}
      statusBar={statusBar}
      columnTypes={columnTypes}
      columnDefs={columnDefs}
      defaultColDef={defaultColDef}
      autoGroupColumnDef={autoGroupColumnDef}

      rowData={props.users}

      animateRows={true}
      rowSelection={'multiple'}
      rowGroupPanelShow={rowGroupPanelShow}
      enableRangeSelection={true}

      groupSelectsChildren={true}
      groupDisplayType={groupDisplayType}

      tooltipShowDelay={0}
      tooltipHideDelay={2000}
      sideBar={sideBar}

      allowContextMenuWithControlKey={true}
      getContextMenuItems={getContextMenuItems}

      onColumnVisible={onColumnVisible}
      // treeData={true}
      // groupDefaultExpanded={-1}
      // getDataPath={getDataPath}

      //onRowClicked={(e:any) => { navigate(`/dashboard/${e.data.email}`); }}
    ></AgGridReact>
  </Box>
  );
}
