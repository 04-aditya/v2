
import { useState, useEffect, useCallback } from "react";
import useAxiosPrivate from "./useAxiosPrivate";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IUserRole } from "sharedtypes";


const ROLESAPI = '/api/roles';

const CACHEKEY = 'roles';

export const useRoles = () => {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const query = useQuery([CACHEKEY], async ()=>{
    const res = await axios.get(ROLESAPI)
    return res.data.data as IUserRole[];
  },{
    enabled: !!axios,
    staleTime:  30 * 60 * 1000 // 30 minute
  });
  const mutation = useMutation(async (role: IUserRole) => {
    const res = await axios.post(ROLESAPI, role);
    return res.data.data;
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries([CACHEKEY]);
  }
  return {...query, mutation, invalidateCache};
}
