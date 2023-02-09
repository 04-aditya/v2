import useAxiosPrivate from "../hooks/useAxiosPrivate";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IPermission, IUser, IUserPAT } from "sharedtypes";


const USERAPI = '/api/users';

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

export const useUser = (id = 'me') => {
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


export const useUserTeam = (id: number|string = 'me') => {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const keys = [CACHEKEY, id, 'team'];
  const query = useQuery(keys, async ()=>{
    const res = await axios.get(`${USERAPI}/${id}/team`);
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

export const useUserStats = (id: number|string = 'me', stats = ['all']) => {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const keys = [CACHEKEY, id, 'stats'];
  const query = useQuery(keys, async ()=>{
    const res = await axios.get(`${USERAPI}/${id}/stats?include=${stats.join(',')}`);
    return res.data.data as {name:string, value:any, all?:any, industry?:any, capability?:any, account?:any}[];
  },{
    enabled: !!axios,
    staleTime:  60 * 60 * 1000 // 60 minute
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
    staleTime:  60 * 60 * 1000 // 5 minute
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
