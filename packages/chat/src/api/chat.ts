import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import useAxiosPrivate from "psnapi/useAxiosPrivate";
import {APIResponse, IChatModel, IChatSession} from "sharedtypes";

const CACHEKEY='chat';
const CHATAPI = '/api/chat';

export function useChatHistory() {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const keys = [CACHEKEY, 'history'];
  const query = useQuery<IChatSession[], AxiosError>(keys, async ()=>{
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


export function useChatModels() {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const keys = [CACHEKEY, 'models'];
  const query = useQuery<IChatModel[], AxiosError>(keys, async ()=>{
    const res = await axios.get(`${CHATAPI}/models`);
    return res.data.data as IChatModel[];
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
  const query = useQuery<IChatSession, AxiosError>(keys, async ()=>{
    const res = await axios.get(`${CHATAPI}/${id}`);
    return res.data.data as IChatSession;
  },{
    enabled: !!axios && id!=='',
    staleTime:  60 * 60 * 1000 // 1 minute
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries(keys);
  }
  const mutation = useMutation(async (data: unknown) => {
    const res = await axios.post(`${CHATAPI}/${id}`, data);
    return res.data.data as IChatSession;
  });
  return {...query, mutation, invalidateCache};
}
