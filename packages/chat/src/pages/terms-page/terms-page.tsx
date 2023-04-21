import { Divider, Paper, Skeleton } from '@mui/material';
import styles from './terms-page.module.css';
import { TermsNotice } from '../../components/TermsNotice';

/* eslint-disable-next-line */
export interface TermsPageProps {}

export function TermsPage(props: TermsPageProps) {
  return (
    <Paper elevation={2}
      sx={{display:'flex', height:'100%', flexDirection:'column', p:{xs:0, sm:1}}}>
      <h3>Terms & Conditions for PS Chat application</h3>
      <Divider/>
      <br/>
      {TermsNotice()}

    </Paper>
  );
}

export default TermsPage;

