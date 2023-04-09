import { useQuery, useQueryClient } from "@tanstack/react-query";
import useAxiosPrivate from "psnapi/useAxiosPrivate";
import {IChatSession} from "sharedtypes";

const CACHEKEY='chat';
const CHATAPI = '/api/chat';

export function useChatHistory() {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const keys = [CACHEKEY, 'history'];
  const query = useQuery(keys, async ()=>{
    const res = await axios.get(`${CHATAPI}/history`);
    return res.data.data as IChatSession[];
  },{
    enabled: !!axios,
    staleTime:  60 * 60 * 1000 // 1 minute
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries(keys);
  }
  return {...query, invalidateCache};
}


export function useChatSession(id: string) {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const keys = [CACHEKEY, id];
  const query = useQuery(keys, async ()=>{
    const res = await axios.get(`${CHATAPI}/${id}`);
    return res.data.data as IChatSession;
  },{
    enabled: !!axios,
    staleTime:  60 * 60 * 1000 // 1 minute
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries(keys);
  }
  return {...query, invalidateCache};
}
