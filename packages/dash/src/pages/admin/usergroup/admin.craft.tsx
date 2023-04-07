import { appstateDispatch } from "sharedui/hooks/useAppState";
import { useEffect } from "react";
import UserGroupList from "./admin.usergroup";

/* eslint-disable-next-line */
export interface AdminClientsProps {}


export function AdminClients(props: AdminClientsProps) {
  const roleoptions =['Admin', 'Craft Lead', 'Regional Craft Lead' ];

  useEffect(() => {
    appstateDispatch({type:'title', data:'Craft (Admin) - PSNext'});
  }, []);

  return <UserGroupList type={'craft'}  sx={{m:1}} roleoptions={roleoptions}/>
}

export default AdminClients;
