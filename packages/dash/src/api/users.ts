import useAxiosPrivate from "../hooks/useAxiosPrivate";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { APIResponse, IPermission, IStatsData, IUser, IUserPAT } from "sharedtypes";


const USERAPI = '/api/users';
const ADMINAPI = '/api/admin';

const CACHEKEY = 'users';

export const useUserPermissions = (id = 'me') => {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const keys = [CACHEKEY, id, 'permissions'];
  const query = useQuery(keys, async ()=>{
    const res = await axios.get(`${USERAPI}/${id}/permissions`)
    return res.data.data as IPermission[];
  },{
    enabled: !!axios,
    staleTime:  5 * 60 * 1000 // 5 minute
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries(keys);
  }
  return {...query, invalidateCache};
}

export const useUser = (id : number|string = 'me') => {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const keys = [CACHEKEY, id];
  const query = useQuery(keys, async ()=>{
    const res = await axios.get(`${USERAPI}/${id}`);
    return res.data.data as IUser;
  },{
    enabled: !!axios,
    staleTime:  5 * 60 * 1000 // 5 minute
  });
  const mutation = useMutation(async (user: IUser) => {
    const res = await axios.patch(`${USERAPI}/${id}`, user);
    return res.data.data;
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries(keys);
  }
  return {...query, mutation, invalidateCache};
}


export const useAllUsers = (custom_details_keys: string[]=[],) => {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const customkeys = custom_details_keys.sort((a,b) => a.localeCompare(b)).join(',');
  const keys = [CACHEKEY,'all',customkeys];
  const query = useQuery(keys, async ()=>{
    const res = await axios.get(`${ADMINAPI}/users?custom_details=${customkeys}`);
    return res.data.data as IUser[];
  },{
    enabled: !!axios,
    staleTime:  30 * 60 * 1000 // 5 minute
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries(keys);
  }
  return {...query, invalidateCache};
}

export const useUserTeam = (id: number|string = 'me', custom_details_keys: string[]=[], usergroups=['org:all'],) => {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const customkeys = custom_details_keys.sort((a,b) => a.localeCompare(b)).join(',');
  const keys = [CACHEKEY, id, 'team', customkeys, usergroups.join(',')];
  const query = useQuery(keys, async ()=>{
    const res = await axios.get(`${USERAPI}/${id}/team?custom_details=${customkeys}&usergroup=${usergroups.join(',')}`);
    return res.data.data as IUser[];
  },{
    enabled: !!axios,
    staleTime:  5 * 60 * 1000 // 5 minute
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries(keys);
  }
  return {...query, invalidateCache};
}

export const useUserSnapshotDates = () => {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const keys = [CACHEKEY, 'snapshotdates'];
  const query = useQuery(keys, async ()=>{
    const res = await axios.get(`${USERAPI}/snapshotdates`);
    const result = res.data as APIResponse<Date[]>;
    return result.data?.map(d=>new Date(d));
  },{
    enabled: !!axios,
    staleTime:  60 * 60 * 1000 // 60 minute
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries(keys);
  }
  return {...query, invalidateCache};
}

export const useUserDataKeys = () => {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const keys = [CACHEKEY, 'datakeys'];
  const query = useQuery(keys, async ()=>{
    const res = await axios.get(`${USERAPI}/datakeys`);
    const result = res.data as APIResponse<string[]>;
    return result.data;
  },{
    enabled: !!axios,
    staleTime:  60 * 60 * 1000 // 60 minute
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries(keys);
  }
  return {...query, invalidateCache};
}

export const useAllDataKeys = () => {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const keys = ['alldatakeys'];
  const query = useQuery(keys, async ()=>{
    const res = await axios.get(`${ADMINAPI}/datakeys`);
    const result = res.data as APIResponse<string[]>;
    return result.data;
  },{
    enabled: !!axios,
    staleTime:  60 * 60 * 1000 // 60 minute
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries(keys);
  }
  return {...query, invalidateCache};
}
export const useAllCustomData = (fields: string) => {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const fieldlist = fields.split(',').map(f=>f.trim()).sort((a,b)=>a.localeCompare(b)).join(',');
  const keys = ['customdata', fieldlist];
  const query = useQuery(keys, async ()=>{
    const res = await axios.get(`${ADMINAPI}/customdata?keys=${fieldlist}`);
    const result = res.data;
    return result.data;
  },{
    enabled: !!axios,
    staleTime:  60 * 60 * 1000 // 60 minute
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries(keys);
  }
  return {...query, invalidateCache};
}

export const useUserStats = (id: number|string = 'me', types = ['all'], usergroup=['org:Team'], snapshot_date?: string|Date) => {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const keys = [CACHEKEY, id, 'stats', types.join(','), usergroup.join(','), snapshot_date||'Last'];
  const query = useQuery(keys, async ()=>{
    const res = await axios.get(`${USERAPI}/${id}/stats?types=${types.join(',')}&usergroup=${usergroup.join(',')}&snapshot_date=${snapshot_date||'Last'}`);
    const result = res.data as APIResponse<Array<any>>;
    return result.data;
  },{
    enabled: !!axios,
    staleTime:  60 * 60 * 1000 // 60 minute
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries(keys);
  }
  return {...query, invalidateCache};
}

export const useUserGroups = (id: number|string = 'me') => {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const keys = [CACHEKEY, id, 'groups'];
  const query = useQuery(keys, async ()=>{
    const res = await axios.get(`${USERAPI}/${id}/groups`);
    return res.data.data as Array<{type: string, name: string, role: string}>;
  }, {
    enabled: !!axios,
    staleTime:  5 * 60 * 1000 // 5 minute
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries(keys);
  }
  return {...query, invalidateCache};
}

export const useUserPATs = (id: number|string = 'me') => {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const keys = [CACHEKEY, id, 'pat'];
  const query = useQuery(keys, async ()=>{
    const res = await axios.get(`${USERAPI}/${id}/pat`);
    return res.data.data as IUserPAT[];
  },{
    enabled: !!axios,
    staleTime:  60 * 60 * 1000 // 1 minute
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries(keys);
  }
  return {...query, invalidateCache};
}


// export const useUserFiles = (id='me') => {
//   const queryClient = useQueryClient();
//   const axios = useAxiosPrivate();
//   const query = useQuery([CACHEKEY+'files', id], async ()=>{
//     const res = await axios.get(`${USERAPI}/${id}/files`)
//     return res.data.data as IFileInfo[];
//   },{
//     enabled: !!axios,
//     staleTime:  60 * 60 * 1000 // 1 hour
//   });
//   const invalidateCache = ()=>{
//     queryClient.invalidateQueries([CACHEKEY+'files',id]);
//   }
//   return {...query, invalidateCache};
// }
