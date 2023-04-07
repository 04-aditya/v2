import { appstateDispatch } from "sharedui/hooks/useAppState";
import { useEffect } from "react";
import UserGroupList from "./admin.usergroup";

/* eslint-disable-next-line */
export interface AdminClientsProps {}


export function AdminClients(props: AdminClientsProps) {
  const roleoptions =['Admin', 'Client Executive', 'Engagement Lead', 'Strategy Lead', 'Product Lead', 'Engineering Lead', 'Experience Lead', 'Data Lead', ];

  useEffect(() => {
    appstateDispatch({type:'title', data:'Clients (Admin) - PSNext'});
  }, []);

  return <UserGroupList type={'client'}  sx={{m:1}} roleoptions={roleoptions}/>
}

export default AdminClients;
