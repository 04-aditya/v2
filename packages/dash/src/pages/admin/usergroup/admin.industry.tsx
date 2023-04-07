import { appstateDispatch } from "sharedui/hooks/useAppState";
import { useEffect } from "react";
import UserGroupList from "./admin.usergroup";

/* eslint-disable-next-line */
export interface AdminIndustryProps {}


export function AdminIndustry(props: AdminIndustryProps) {
  const roleoptions =['Admin', 'Business Lead', 'Industry Lead', 'Industry Strategy', 'Industry Engineering Lead', 'Industry Product Lead', 'Industry Experience Lead', 'Industry Data Lead',];

  useEffect(() => {
    appstateDispatch({type:'title', data:'Industry (Admin) - PSNext'});
  }, []);

  return <UserGroupList type={'industry'}  sx={{m:1}} roleoptions={roleoptions}/>
}

export default AdminIndustry;
