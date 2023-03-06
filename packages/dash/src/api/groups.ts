import useAxiosPrivate from "../hooks/useAxiosPrivate";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { APIResponse, IUserGroup } from "sharedtypes";


const USERGROUPAPI = '/api/usergroup';

const CACHEKEY = 'usergroup';

export const useGroups = (type:string) => {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const keys = [CACHEKEY, type];
  const query = useQuery(keys, async ()=>{
    const res = await axios.get(`${USERGROUPAPI}/${type}`);
    return res.data.data as IUserGroup[];
  },{
    enabled: !!axios,
    staleTime:  5 * 60 * 1000 // 5 minute
  });
  const mutation = useMutation(async (user: IUserGroup) => {
    const res = await axios.post(`${USERGROUPAPI}/`, user);
    return res.data.data;
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries(keys);
  }
  return {...query, mutation, invalidateCache};
}
