import { useState, useEffect, useCallback } from "react";
import useAxiosPrivate from "./useAxiosPrivate";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IClient } from "sharedtypes";

const CLIENTSAPI = '/api/clients';

export const useClients = () => {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const CACHEKEY = 'clients';
  const query = useQuery([CACHEKEY], async ()=>{
    const res = await axios.get(CLIENTSAPI)
    return res.data.data as IClient[];
  },{
    enabled: !!axios,
    staleTime:  60 * 60 * 1000 // 60 minute
  });
  const mutation = useMutation(async (client: IClient) => {
    const res = await axios.post(CLIENTSAPI, client);
    return res.data.data as IClient;
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries([CACHEKEY]);
  }
  return {...query, mutation, invalidateCache};
}
