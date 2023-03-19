import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { IUser } from "sharedtypes";
import { Box } from "@mui/material";
import { ColDef, ColumnVisibleEvent, SideBarDef, GetContextMenuItemsParams, MenuItemDef, RowNode, ColGroupDef, IRowNode } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useNavigate } from "react-router-dom";
import { BasicUserCardTooltip } from "./BasicUserCard";
import { RegionRenderer } from "./RegionRenderer";
import 'ag-grid-enterprise';
import { isDate, parseISO } from "date-fns";

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

export interface UserGridProps {
  users: IUser[];
  onColumnVisible?: (event: ColumnVisibleEvent<IUser>) => void;
  custom_details?: string[];
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
    if (!props.custom_details)
      return setColumnDefs(standardColumns);

    const coldefs = [...standardColumns];
    for(const key of props.custom_details) {
      const fparts = key.split(':');
      const sample = props.users.find(u => u.custom_details && u.custom_details[key]);
      if (sample?.custom_details && sample?.custom_details[key]?.details) {
        const children: ColDef[] = [];
        Object.keys(sample.custom_details[key].details).forEach(k => {
          // const val:any = sample.custom_details?sample.custom_details[key].details[k]:undefined;
          const isdate = k.toLowerCase().indexOf('date')!==-1;
          children.push({
            field: k,
            valueGetter: params => {
              if (!params.data) return null;
              if (!params.data.custom_details) return null;
              const kpi = params.data.custom_details[`${key}`];
              if (!kpi || !kpi.details[k]) return '';
              return isdate? parseISO(kpi.details[k]) : kpi.details[k];
            },
            type: isdate ? ['dateColumn', 'nonEditableColumn'] : ['nonEditableColumn'],
            enableRowGroup: true, colId: `details-${key}-${k}`
          });
        });
        coldefs.push({field: fparts[1], colId: `details-${key}`, children, initialHide: true } as ColGroupDef);
      } else {
        coldefs.push({field: fparts[1], valueGetter: params => {
          if (!params.data) return null;
          if (!params.data.custom_details) return null;
          const kpi = params.data.custom_details[`${key}`];
          if (!kpi) return '';
          return kpi.value;
        },
        enableRowGroup: true, colId: `details-${key}`, initialHide: true });
      }
    }
    setColumnDefs(coldefs);
  },[props.custom_details, props.users]);

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
