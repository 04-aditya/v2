import { Checkbox, Chip, FormControl, IconButton, InputLabel, ListItemText, MenuItem, OutlinedInput, Paper, Select, SelectChangeEvent, Stack } from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { useRoles } from 'psnapi/roles';
import { ICellRendererParams } from 'ag-grid-community';
import { useState } from 'react';
import ButtonPopover from './ButtonPopover';
import { MenuProps } from '@/components/MenuProps';
import { IUserRole } from 'sharedtypes';

export const RolesRenderer1 = (params: any) => {
  return (
    <>
      {params.value.map((r: any) => {
        const name = r.name || r;
        return <Chip key={r.id || r} size='small' label={name} color={name === 'admin' ? 'error' : 'default'} />;
      })}
      <IconButton aria-label='add role' color='primary'>
        <AddCircleIcon />
      </IconButton>
    </>
  );
};

export const RoleNamesRenderer = (params: ICellRendererParams) => {
  const {data: allRoles=[]} = useRoles();
  const [roles, setRoles] = useState<string[]>(params.value||[]);

  const handleChange = (event: SelectChangeEvent<string[]>) => {
    const {
      target: { value },
    } = event;
    const vals = typeof value === 'string' ? value.split(',') : value;
    const np = allRoles.filter(p=>vals.indexOf(p.name)!==-1);
    setRoles(np.map(n=>n.name));
  };

  const handleClose = (event:unknown, reason:"backdropClick" | "escapeKeyDown") => {
    if (params.setValue) {
      params.setValue([...roles]);
    }
  }

  return (
  <Stack direction={'row'} spacing={0.5} alignItems='center' flexWrap={'wrap'}>
    <ButtonPopover icon={<AddCircleIcon/>} onClose={handleClose} color='primary'>
      <Paper sx={{minWidth:320}}>
        <FormControl sx={{ m: 1}} fullWidth>
          <InputLabel id="roles-multiple-checkbox-label">Roles</InputLabel>
          <Select fullWidth
            labelId="roles-multiple-checkbox-label"
            id="roles-multiple-checkbox"
            multiple
            value={(roles||[])}
            onChange={handleChange}
            input={<OutlinedInput label="Roles" />}
            renderValue={(selected) => selected.join(', ')}
            MenuProps={MenuProps}
          >
            {allRoles.map((r) => (
              <MenuItem key={r.id} value={r.name}>
                <Checkbox checked={roles.findIndex(role => role === r.name) > -1} />
                <ListItemText primary={r.name} secondary={r.description} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>
    </ButtonPopover>
    {roles.map(r => <Chip key={r} size='small'  label={r}/> )}
  </Stack>
  );
}

export const RolesRenderer = (params: ICellRendererParams) => {
  const {data: allRoles=[]} = useRoles();
  const [roles, setRoles] = useState<IUserRole[]>(params.value||[]);

  const handleChange = (event: SelectChangeEvent<string[]>) => {
    const {
      target: { value },
    } = event;
    const vals = typeof value === 'string' ? value.split(',') : value;
    const np = allRoles.filter(p=>vals.indexOf(p.name)!==-1);
    setRoles(np);
  };

  const handleClose = (event:unknown, reason:"backdropClick" | "escapeKeyDown") => {
    if (params.setValue) {
      params.setValue([...roles]);
    }
  }

  return (
  <Stack direction={'row'} spacing={0.5} alignItems='center' flexWrap={'wrap'}>
    <ButtonPopover icon={<AddCircleIcon/>} onClose={handleClose} color='primary'>
      <Paper sx={{minWidth:320}}>
        <FormControl sx={{ m: 1}} fullWidth>
          <InputLabel id="roles-multiple-checkbox-label">Roles</InputLabel>
          <Select fullWidth
            labelId="roles-multiple-checkbox-label"
            id="roles-multiple-checkbox"
            multiple
            value={(roles||[]).map(r=>r.name)}
            onChange={handleChange}
            input={<OutlinedInput label="Roles" />}
            renderValue={(selected) => selected.join(', ')}
            MenuProps={MenuProps}
          >
            {allRoles.map((r) => (
              <MenuItem key={r.id} value={r.name}>
                <Checkbox checked={roles.findIndex(role => role.id === r.id) > -1} />
                <ListItemText primary={r.name} secondary={r.description} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>
    </ButtonPopover>
    {roles.map((r:IUserRole)=><Chip key={r.id} size='small'  label={r.name}/> )}
  </Stack>
  );
}
