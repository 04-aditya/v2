
import { useState, useEffect, useCallback } from "react";
import useAxiosPrivate from "./useAxiosPrivate";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IPermission } from "sharedtypes";


const PERMSAPI = '/api/permissions';

const CACHEKEY = 'permissions';

export const usePermissions = () => {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const query = useQuery([CACHEKEY], async ()=>{
    const res = await axios.get(PERMSAPI)
    return res.data.data as IPermission[];
  },{
    enabled: !!axios,
    staleTime:  30 * 60 * 1000 // 30 minute
  });
  const mutation = useMutation(async (permission: IPermission) => {
    const res = await axios.post(PERMSAPI, permission);
    return res.data.data;
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries([CACHEKEY]);
  }
  return {...query, mutation, invalidateCache};
}
