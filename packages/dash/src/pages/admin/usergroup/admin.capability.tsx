import { appstateDispatch } from "@/hooks/useAppState";
import { useEffect } from "react";
import UserGroupList from "./admin.usergroup";

/* eslint-disable-next-line */
export interface AdminClientsProps {}


export function AdminClients(props: AdminClientsProps) {
  const roleoptions =['Admin', 'Capability Lead', 'Regional Capability Lead' ];
  useEffect(() => {
    appstateDispatch({type:'title', data:'Capability (Admin) - PSNext'});
  }, []);
  return <UserGroupList type={'capability'}  sx={{m:1}} roleoptions={roleoptions}/>
}

export default AdminClients;
