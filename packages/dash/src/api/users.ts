import useAxiosPrivate from "../hooks/useAxiosPrivate";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IUser } from "sharedtypes";


const USERAPI = '/api/users';

const CACHEKEY = 'users';

export const useUser = (id='me') => {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const query = useQuery([CACHEKEY, id], async ()=>{
    const res = await axios.get(`${USERAPI}/${id}`)
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
    queryClient.invalidateQueries([CACHEKEY,id]);
  }
  return {...query, mutation, invalidateCache};
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
