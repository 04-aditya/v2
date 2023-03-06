import { useState } from 'react';
import { getUserName, IUser } from 'sharedtypes';
import { Chip, Paper, Stack } from '@mui/material';
import { ICellRendererParams } from 'ag-grid-community';
import ButtonPopover from '@/components/ButtonPopover';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { useAllUsers } from '@/api/users';
import UserSelect from '@/components/UserSelect';

export const UserRenderer = (params: ICellRendererParams<IUser>) => {
  const { data: allusers } = useAllUsers();

  const [user, setUser] = useState<IUser | null>(params.value);

  const handleChange = (event: any, newValue: IUser | null) => {
    if (params.setValue) {
      setUser(newValue);
      params.setValue(newValue);
    }
  };
  return (user && user.id!==-1) ? <Chip key={user.id} size='small' variant='outlined' label={getUserName(user)} onDelete={e => setUser(null)} /> : <ButtonPopover icon={<AddCircleIcon />} size='small' color='primary'>
    <Paper sx={{ minWidth: 320, m: 1 }}>
      <UserSelect users={allusers || []} value={params.value || null} onChange={handleChange} />
    </Paper>
  </ButtonPopover>;
};

export const UserListRenderer = (params: ICellRendererParams<IUser[]>) => {
  const {data: allusers} = useAllUsers();

  const [users, setUsers] = useState<IUser[]>(params.value||[]);

  const handleChange = (event:any, newValue: IUser|null) => {
    if (!newValue) return;
    setUsers(olduserslist=>{
      let userlist: IUser[] = [...olduserslist];
      if (!olduserslist.find(u=>u.id===newValue?.id))
        userlist = [...olduserslist, newValue];

      if (params.setValue) params.setValue(userlist);
      return userlist;
    });
  };

  const removeUser = (user: IUser) => {
    setUsers(olduserslist => {
      const userlist: IUser[] = [...olduserslist];
      const idx = olduserslist.findIndex(u=>u.id===user.id);
      if (idx>=0) userlist.splice(idx, 1);
      return userlist;
    });
  }
  return (<Stack spacing={1} direction='column'>
    {users.map(user => <Chip key={user.id} size='small' label={getUserName(user)} onDelete={e=>removeUser(user)}/>)}
    <ButtonPopover icon={<AddCircleIcon/>} color='primary'>
      <Paper sx={{minWidth:320, m:1}}>
        <UserSelect users={allusers||[]} value={users.length>0 ? users[users.length-1] : null} onChange={handleChange}/>
      </Paper>
    </ButtonPopover>
  </Stack>
  );
}
