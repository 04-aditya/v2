import useAxiosPrivate from "./useAxiosPrivate";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { APIResponse, IStatType } from "sharedtypes";


const STATSAPI = '/api/stats';

const CACHEKEY = 'stats';

export const useStatTypes = () => {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const keys = [CACHEKEY, 'types'];
  const query = useQuery(keys, async ()=>{
    const res = await axios.get(`${STATSAPI}/types`);
    const output = res.data as APIResponse<IStatType[]>;
    return output.data as IStatType[];
  },{
    enabled: !!axios,
    staleTime:  5 * 60 * 1000 // 5 minute
  });
  const mutation = useMutation(async (stat: IStatType) => {
    const res = await axios.post(`${STATSAPI}/types`, stat);
    const output = res.data as APIResponse<IStatType>;
    return output.data;
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries(keys);
  }
  return {...query, mutation, invalidateCache};
}
