import { getUserName, ITeamMember, IUser } from 'sharedtypes';
import { Box, Button, Chip, FormControl, FormGroup, FormHelperText, Grid, Input, InputLabel, MenuItem, Paper, Select, SelectChangeEvent, TextField, Typography } from '@mui/material';
import { Stack } from '@mui/system';
import { ICellRendererParams } from 'ag-grid-community';
import * as React from 'react';
import ButtonPopover from './ButtonPopover';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import UserSelect from './UserSelect';
import { useState } from 'react';


export const TeamMembersRenderer = (params: ICellRendererParams<ITeamMember[]>)=>{
  const [user, setUser] = useState<IUser|null>(null);
  const [role, setRole] = React.useState('');
  const [details, setDetails] = React.useState('{}');

  const onUserSelected = (event: any, newValue: IUser|null) => {
    if (!newValue) return;
    setUser(newValue);
  }

  const handleRoleChange = (event: SelectChangeEvent) => {
    setRole(event.target.value as string);
  };

  const handleDetailsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDetails(event.target.value as string);
  }

  const handleAdd = () => {
    if (params.setValue) {
      params.api.startEditingCell({
        rowIndex: params.rowIndex,
        colKey: params.column!.getId(),
      });
      params.setValue([...params.value, {id: -1, user, role, details: JSON.parse(details)}]);
    }
  }

  const removeMember = (tm: ITeamMember) => {
    if (params.setValue) {
      params.api.startEditingCell({
        rowIndex: params.rowIndex,
        colKey: params.column!.getId(),
      });
      params.setValue(params.value.filter((t:ITeamMember) => t.user.id!==tm.user.id));
    }
  }

  return <Stack spacing={1} direction={'column'}>
    {params.value.map((tm: ITeamMember) => <Chip key={tm.id} variant='outlined' label={getUserName(tm.user)+` : ${tm.role}`} onDelete={e=>removeMember(tm)}/>)}
    <ButtonPopover icon={<AddCircleIcon/>} color='primary'>
      <Box sx={{minWidth:400, minHeight: 320, p:1}}>
        <Typography variant='caption'>Add new Team Member</Typography>
        <hr/>
        <Stack spacing={1} direction={'column'}>
          <FormControl>
            <UserSelect id="user-input" aria-describedby="user-helper-text" label='User' fullWidth
              users={(params as any)['allUsers']} value={user} onChange={onUserSelected} />
            <FormHelperText id="user-helper-text">select a temmember.</FormHelperText>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel id="role-select-label">Role</InputLabel>
            <Select
              labelId="role-select-label"
              id="role-select"
              value={role}
              label="Role"
              onChange={handleRoleChange}
            >
              <MenuItem value={'Business Lead'}>Business Lead</MenuItem>
              <MenuItem value={'Industry Lead'}>Industry Lead</MenuItem>
              <MenuItem value={'Industry Engineering Lead'}>Industry Engineering Lead</MenuItem>
              <MenuItem value={'Industry Product Lead'}>Industry Product Lead</MenuItem>
            </Select>
            <FormHelperText id="user-helper-text">select a role for the user.</FormHelperText>
          </FormControl>
          <FormControl fullWidth>
            <TextField id="details-input" aria-describedby="details-helper-text" label='Details' fullWidth
              multiline rows={3} value={details} onChange={handleDetailsChange}
            />
            <FormHelperText id="user-helper-text">add additional details.</FormHelperText>
          </FormControl>
        </Stack>
        <Box sx={{display:'flex', justifyContent:'flex-end', mt:1}}>
          <Button variant='contained' color='primary' onClick={handleAdd}>Add</Button>
        </Box>
      </Box>
    </ButtonPopover>
  </Stack>
}
