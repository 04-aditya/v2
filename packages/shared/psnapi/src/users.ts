import useAxiosPrivate from "./useAxiosPrivate";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { APIResponse, IPermission, IStatsData, IUser, IUserData, IUserPAT } from "sharedtypes";


const USERAPI = '/api/users';
const ADMINAPI = '/api/admin';

const CACHEKEY = 'users';


export const useAllUsers = (data_keys: string[]=[],) => {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const datakeys = data_keys.sort((a,b) => a.localeCompare(b)).join(',');
  const keys = [CACHEKEY,'all',datakeys];
  const query = useQuery(keys, async ()=>{
    const res = await axios.get(`${ADMINAPI}/users?datakeys=${datakeys}`);
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
  const mutation = useMutation(async (data: {key: string, newkey: string}) => {
    const res = await axios.post(`${ADMINAPI}/datakeys/${data.key}`, {newkey: data.newkey});
    return res.data.data;
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries(keys);
  }
  return {...query, mutation, invalidateCache};
}
export const useAllUserData = (fields: string, limit = 20) => {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const fieldlist = fields.split(',').map(f=>f.trim()).sort((a,b)=>a.localeCompare(b)).join(',');
  const keys = ['customdata', fieldlist];
  const query = useQuery(keys, async ()=>{
    const res = await axios.get(`${ADMINAPI}/userdata?keys=${fieldlist}&limit=${limit}`);
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


export const useUserTeam = (id: number|string = 'me', data_keys: string[]=[], usergroups=['org:Team'],) => {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const datakeys = data_keys.sort((a,b) => a.localeCompare(b)).join(',');
  const keys = [CACHEKEY, id, 'team', datakeys, usergroups.join(',')];
  const query = useQuery(keys, async ()=>{
    const res = await axios.get(`${USERAPI}/${id}/team?datakeys=${datakeys}&usergroups=${usergroups.join(',')}`);
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

interface useUserDataOptions {
  id: number|string;
  data_keys: string[];
  usergroups: string[];
  minDate?: Date;
  maxDate?: Date;
};

export const useUserData = ({id='me', data_keys=[], usergroups=[], minDate, maxDate}: useUserDataOptions) => {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const datakeys = data_keys.sort((a,b) => a.localeCompare(b)).join(',');
  const keys = [CACHEKEY, id, 'data', datakeys, usergroups.join(',')];
  const query = useQuery(keys, async ()=>{
    const res = await axios.get(`${USERAPI}/${id}/data?datakeys=${datakeys}&usergroups=${usergroups.join(',')}&minDate=${minDate?.toISOString()}&maxDate=${maxDate?.toISOString()}`);
    return res.data.data as Map<string, Map<string, IUserData[]>>;
  },{
    enabled: !!axios,
    staleTime:  5 * 60 * 1000 // 5 minute
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
