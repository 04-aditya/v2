import { Box } from '@mui/material';
import styles from './login-page.module.css';

/* eslint-disable-next-line */
export interface LoginPageProps {}

export function LoginPage(props: LoginPageProps) {
  return (
    <Box className={styles['container']} sx={{display:'flex', height:'100%',justifyContent:'center', alignItems:'center'}}>
      <h1>Welcome to LoginPage!</h1>
    </Box>
  );
}

export default LoginPage;
