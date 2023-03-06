import * as React from 'react';
import { SxProps, Box, Accordion, AccordionDetails, AccordionSummary, Typography, TextField } from "@mui/material";
import { useGroups } from '@/api/groups';
import useAxiosPrivate from '@/hooks/useAxiosPrivate';
import { useLocation, useNavigate } from 'react-router-dom';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { TeamMembersRenderer } from '@/components/TeamMembersRenderer';
import { UserRenderer } from '@/components/UserRenderer';
import { ITeamMember, IUserGroup } from 'sharedtypes';
import 'ag-grid-enterprise';
import { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Row } from '@/components/Row';


interface UserGroupPanelProps {
  group: IUserGroup;
  roleoptions: string[];
  onChange?: (data: IUserGroup)=>void;
}
const UserGroupPanel = (props: UserGroupPanelProps) => {
  const [team, setTeam] = React.useState<ITeamMember[]>([]);
  const [columnDefs, setColumnDefs] = React.useState<ColDef<ITeamMember>[]>([
    { field: 'user', cellRenderer: UserRenderer, editable: true, minWidth: 150, flex:0, },
    { field: 'role',minWidth: 150, editable: true, flex:0,
      cellEditor: 'agRichSelectCellEditor', cellEditorPopup: true,
      cellEditorParams: {
        values: props.roleoptions,
        cellheight: 30,
      },
    },
    { field: 'details', editable: true, flex: 1,
      valueGetter: params => JSON.stringify(params.data?.details),
      valueSetter: params => {
        try {
          params.data.details = JSON.parse(params.newValue);
          return true;
        } catch (ex) {
          return false;
        }
      }

    },
  ])

  React.useEffect(()=>{
    setColumnDefs([
      { field: 'user', cellRenderer: UserRenderer, editable: true, minWidth: 150 },
      { field: 'role',minWidth: 150, editable: true,
        cellEditor: 'agRichSelectCellEditor', cellEditorPopup: true,
        cellEditorParams: {
          values: props.roleoptions,
          cellheight: 30,
        },
      },
      { field: 'details', editable: true, flex: 1,
        valueGetter: params => JSON.stringify(params.data?.details),
        valueSetter: params => {
          try {
            params.data.details = JSON.parse(params.newValue);
            return true;
          } catch (ex) {
            return false;
          }
        }

      },
    ])
  }, [props.roleoptions]);

  React.useEffect(()=>{
    setTeam([...props.group.team, {id:-1, user:{id:-1, email:'', roles:[]}, role: props.roleoptions[0], details:{}}]);
  }, [props.group.team]);

  const onCellValueChanged =  React.useCallback((e:any) =>{
    const teamMember = {...e.data};
    if (teamMember && e.colDef.field && e.newValue) {
      teamMember[e.colDef.field] = e.newValue;
      const idx = team.findIndex(t=>t.id===teamMember.id);
      team[idx]= teamMember;
      if (props.onChange) props.onChange({...props.group, team:[...team.filter(t=>t.user.id!==-1)]});
    }
  }, [team]);

  return <Box className="ag-theme-alpine" sx={{width:'100%', height:300}}>
    <AgGridReact<ITeamMember>
      rowData={team}
      columnDefs={columnDefs}
      onCellValueChanged={onCellValueChanged}
      rowHeight={48}
    />
  </Box>
}

interface UserGroupListProps {
  type: string;
  roleoptions: string[];
  sx?: SxProps;
}

export default function UserGroupList(props: UserGroupListProps) {
  const navigate = useNavigate();
  const axios = useAxiosPrivate();
  const {data: groups = [], isLoading, mutation, invalidateCache} = useGroups(props.type);
  const [expanded, setExpanded] = React.useState(-1);
  const [searchText, setSearchText] = React.useState<string>('');

  const handleAccordianChange =
    (panelid: number) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(isExpanded ? panelid : -1);
    };
  const handleGroupEdits = (data: IUserGroup) => {
    mutation.mutate(data,{
      onSuccess: (data) => invalidateCache(),
      onError: err => console.error(err),
    });
  }
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  }

  return <Box sx={props.sx}>
    <Row sx={{mb:1}}>
      <TextField label="Search" value={searchText} onChange={handleSearch} size='small' />
    </Row>
    {groups.filter(g=>g.name.toLowerCase().startsWith(searchText.toLowerCase())) .map(group =><Accordion key={group.id}  expanded={expanded === group.id} TransitionProps={{ unmountOnExit: true }}
      onChange={handleAccordianChange(group.id)}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="usergroup-content"
          id="usergroup-header"
        >
          <Typography sx={{ width: '33%', flexShrink: 0 }}>
            {group.name}
          </Typography>
          <Typography sx={{ color: 'text.secondary' }}></Typography>
        </AccordionSummary>
        <AccordionDetails>
           <UserGroupPanel group={group} roleoptions={props.roleoptions} onChange={handleGroupEdits} />
        </AccordionDetails>
      </Accordion>) }
  </Box>
}
