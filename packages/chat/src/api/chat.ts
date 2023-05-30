import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { parseISO } from "date-fns";
import useAxiosPrivate from "psnapi/useAxiosPrivate";
import {APIResponse, IChatCommand, IChatContext, IChatModel, IChatSession} from "sharedtypes";

const CACHEKEY='chat';
const CHATAPI = '/api/chat';

export function useChatHistory(offset = 0, limit = 20) {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const keys = [CACHEKEY, 'history', offset, limit];
  const query = useQuery<IChatSession[], AxiosError>(keys, async ()=>{
    const res = await axios.get(`${CHATAPI}/history?offset=${offset}&limit=${limit}`);
    return res.data.data as IChatSession[];
  },{
    enabled: !!axios,
    staleTime:  5 * 60 * 1000 // 5 minute
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries(keys);
  }
  return {...query, invalidateCache};
}


export function useChatCommands() {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const keys = [CACHEKEY, 'commands'];
  const query = useQuery<IChatCommand[], AxiosError>(keys, async ()=>{
    const res = await axios.get(`${CHATAPI}/commands`);
    return res.data.data as IChatCommand[];
  },{
    enabled: !!axios,
    staleTime:  15 * 60 * 1000 // 15 minute
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
    staleTime:  15 * 60 * 1000 // 15 minute
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries(keys);
  }
  return {...query, invalidateCache};
}

export function useChatContexts(modelid: string) {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const keys = [CACHEKEY, 'model', modelid, 'contexts'];
  const query = useQuery<IChatContext[], AxiosError>(keys, async ()=>{
    const res = await axios.get(`${CHATAPI}/models/${modelid}/contexts`);
    return res.data.data as IChatContext[];
  },{
    enabled: !!axios && modelid!=='',
    staleTime:  5 * 60 * 1000 // 5 minute
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries(keys);
  }
  return {...query, invalidateCache};
}

export function useChatSession(id?: string) {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const keys = [CACHEKEY, 'session', id];
  const query = useQuery<IChatSession, AxiosError>(keys, async ()=>{
    const res = await axios.get(`${CHATAPI}/${id}`);
    const session = res.data.data as IChatSession;
    session.messages.forEach(m=>{parseISO(m.createdAt+'')});
    return session;
  },{
    enabled: !!axios && id !== undefined,
    staleTime: 60 * 1000 // 1 minute
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries({queryKey: keys});
  }
  const mutation = useMutation(async (data: unknown) => {
    const res = await axios.post(`${CHATAPI}/`, data);
    return res.data as APIResponse<IChatSession>;
  });
  return {...query, mutation, invalidateCache};
}

export function useChatSessionFavourite(id?: string) {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const keys = [CACHEKEY, id||'-1','favourite'];
  const query = useQuery<boolean, AxiosError>(keys, async ()=>{
    const res = await axios.get(`${CHATAPI}/${id}/favourite`);
    return res.data.data ? true : false;
  },{
    enabled: !!axios && id !== undefined,
    staleTime: 60 * 60 * 1000 // 1 hour
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries(keys);
  }
  const mutation = useMutation(async (data: boolean) => {
    const res = await axios.post(`${CHATAPI}/${id}/favourite`, {status: data});
    return res.data.data;
  });
  return {...query, mutation, invalidateCache};
}

export function useChatStats(type='user', offset=0, limit=10) {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const keys = [CACHEKEY, 'stats', type, offset, limit];
  const query = useQuery<Array<any>, AxiosError>(keys, async ()=>{
    const res = await axios.get(`${CHATAPI}/stats?type=${type}&offset=${offset}&limit=${limit}`);
    return res.data.data as Array<any>;
  },{
    enabled: !!axios,
    staleTime:  60 * 60 * 1000 // 1 hour
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries(keys);
  };
  return {...query, invalidateCache};
}

export function useChatFiles(type='file', offset=0, limit=10) {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const keys = [CACHEKEY, 'files', type, offset, limit];
  const query = useQuery<Array<{ name: string; url: string; timestamp: Date; metadata: Record<string, any> }> | undefined, AxiosError>(keys, async ()=>{
    const res = await axios.get(`${CHATAPI}/files?type=${type}&offset=${offset}&limit=${limit}`);
    const result = res.data as APIResponse<Array<{ name: string; url: string; timestamp: Date; metadata: Record<string, any> }>>;
    return result.data;
  },{
    enabled: !!axios,
    staleTime:  5 * 60 * 1000, // 5 min
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries(keys);
  };
  return {...query, invalidateCache};
}
