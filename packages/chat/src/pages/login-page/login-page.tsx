import { Box } from '@mui/material';
import styles from './login-page.module.css';
import LoginCard from 'sharedui/components/LoginCard';
/* eslint-disable-next-line */
export interface LoginPageProps {}

export function LoginPage(props: LoginPageProps) {
  return (
    <Box className={styles['container']} sx={{display:'flex', height:'100%',justifyContent:'center', alignItems:'center'}}>
      <LoginCard/>
    </Box>
  );
}

export default LoginPage;
