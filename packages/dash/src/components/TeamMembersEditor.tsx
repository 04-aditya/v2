import { getUserName, ITeamMember } from '@/../../shared/types/src';
import { CardContent, CardHeader, Paper, Typography } from '@mui/material';
import { ColDef, ICellEditorParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import * as React from 'react';
import { UserRenderer } from './UserRenderer';



export const TeamMembersEditor = React.forwardRef((props: ICellEditorParams<ITeamMember[]>, ref) => {
  const [value, setValue] = React.useState<ITeamMember[]>(props.value);

  /* Component Editor Lifecycle methods */
  React.useImperativeHandle(ref, () => {
      return {
          // the final value to send to the grid, on completion of editing
          getValue() {
            return value;
          },

          // Gets called once before editing starts, to give editor a chance to
          // cancel the editing before it even starts.
          isCancelBeforeStart() {
            return false;
          },

          // Gets called once when editing is finished (eg if Enter is pressed).
          // If you return true, then the result of the edit will be ignored.
          isCancelAfterEnd() {
            return false;
              // our editor will reject any value greater than 1000
              //return value > 1000;
          }
      };
  });
  const [columnDefs] = React.useState<ColDef<ITeamMember>[]>([
      { field: 'user', cellRenderer: UserRenderer, minWidth: 150 },
      { field: 'role',minWidth: 150, editable: true,
        cellEditor: 'agRichSelectCellEditor', cellEditorPopup: true,
        cellEditorParams: {
          values: ['Business Lead', 'Industry Lead', 'Industry Engineering Lead', 'Industry Product Lead'],
          cellheight: 30,
        },
      },
      { field: 'details', editable: true }
  ])

  const onRowValueChanged = React.useCallback((event:any) => {
    const data : ITeamMember = event.data;
    setValue([...value, data]);
    props.node.setData([...value, data]);
  },[props]);

  return (
    <Paper sx={{width:400, height:300}}>
      <AgGridReact<ITeamMember>
        rowData={[...value, {id:-1, user:{id:-1, email:'', roles:[]}, role: 'Industry Lead', details:{}}]}
        columnDefs={columnDefs}
        onRowValueChanged={onRowValueChanged}
      />
    </Paper>
  );
});
