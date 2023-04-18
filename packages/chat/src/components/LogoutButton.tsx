import { Button, ButtonProps } from "@mui/material";
import axios from "axios";
import useAuth from "psnapi/useAuth";
import { useNavigate } from "react-router-dom";


export default function LogoutButton(props:ButtonProps) {
  const navigate = useNavigate();
  const {setAuth} = useAuth();
  const {onClick, ...rest} = props;
  const handleClick = (e:React.MouseEvent<HTMLButtonElement>)=>{
    axios.get(`${process.env['NX_API_URL']}/auth/logout`)
    .then(()=>{
      setAuth({});
      if (onClick) onClick(e)
      navigate('/login');
      //navigate(`https://login.microsoftonline.com/common/oauth2/v2.0/logout?post_logout_redirect_uri=${global.window.location.protocol}://${global.window.location.hostname}/login`);
    })
    .catch(console.error);
  }
  return <Button {...rest} onClick={handleClick}/>
}
