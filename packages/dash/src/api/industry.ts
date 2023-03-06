import { useState, useEffect, useCallback } from "react";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IClient, IIndustry } from "sharedtypes";

const INDUSTRYAPI = '/api/industry';

export const useIndustry = () => {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const CACHEKEY = 'industries';
  const query = useQuery([CACHEKEY], async ()=>{
    const res = await axios.get(INDUSTRYAPI)
    return res.data.data as IIndustry[];
  },{
    enabled: !!axios,
    staleTime:  60 * 60 * 1000 // 60 minute
  });
  const mutation = useMutation(async (industryData: IIndustry) => {
    const res = await axios.post(INDUSTRYAPI, industryData);
    return res.data.data as IIndustry;
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries([CACHEKEY]);
  }
  return {...query, mutation, invalidateCache};
}
