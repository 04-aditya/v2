import { Button, ButtonProps } from "@mui/material";
import { AxiosError } from "axios";
import useAuth from "psnapi/useAuth";
import useAxiosPrivate from "psnapi/useAxiosPrivate";
import { useNavigate } from "react-router-dom";


export default function LogoutButton(props:ButtonProps) {
  const axios = useAxiosPrivate();
  const navigate = useNavigate();
  const {setAuth} = useAuth();
  const {onClick, ...rest} = props;
  const handleClick = (e:React.MouseEvent<HTMLButtonElement>)=>{
    axios.get(`${process.env['NX_API_URL']}/auth/logout`,{
      withCredentials: true
    })
    .then(()=>{
      setAuth({});
      if (onClick) onClick(e)
      //navigate(`https://login.microsoftonline.com/common/oauth2/v2.0/logout?post_logout_redirect_uri=${global.window.location.protocol}://${global.window.location.hostname}/login`);
    })
    .catch((err:AxiosError) => {
      if (err.response?.status===401 || err.response?.status===403) {
        setAuth({});
      }
    })
    .finally(()=>{
      navigate('/login');
    })
  }
  return <Button {...rest} onClick={handleClick}/>
}
