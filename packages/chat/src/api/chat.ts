import { useQuery, useQueryClient } from "@tanstack/react-query";
import useAxiosPrivate from "psnapi/useAxiosPrivate";

const CACHEKEY='chat';
const CHATAPI = '/api/chat';

type ChatMessage = {
  role: 'user' | 'system' | 'assistant';
  content: string;
};
type ChatSession = {
  chatId: string;
  name: string;
  messages: Array<ChatMessage>;
  options?: {
    temperature: number;
    top_p: number;
    frequency_penalty: number;
    presence_penalty: number;
    max_tokens: number;
    stop?: string;
  };
};
export function useChatHistory() {
  const queryClient = useQueryClient();
  const axios = useAxiosPrivate();
  const keys = [CACHEKEY, 'history'];
  const query = useQuery(keys, async ()=>{
    const res = await axios.get(`${CHATAPI}/history`);
    return res.data.data as ChatSession[];
  },{
    enabled: !!axios,
    staleTime:  60 * 60 * 1000 // 1 minute
  });
  const invalidateCache = ()=>{
    queryClient.invalidateQueries(keys);
  }
  return {...query, invalidateCache};
}
