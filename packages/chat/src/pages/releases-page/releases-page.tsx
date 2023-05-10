import { Box, Divider, Grid, Paper, Skeleton } from '@mui/material';
import styles from './releases-page.module.css';
import { ReactMarkdown } from 'react-markdown/lib/react-markdown';
import gfm from 'remark-gfm';

/* eslint-disable-next-line */
export interface ReleasesPageProps {}

export function ReleasesPage(props: ReleasesPageProps) {
  return (
    <Paper elevation={2}
      sx={{display:'flex', height:'100%', flexDirection:'column', p:{xs:0, sm:1}}}>
      <h3>Release History for PS Chat application</h3>
      <Divider/>
      <br/>
      <Box sx={{maxWidth:{xs:'100%', sm:'600'}, p:2}}>
        {/* <ReleaseInfo date={'**Date**'} content={'**Description**'}/>
        <Divider/> */}
        <Box sx={{maxHeight:'450px'}} className='scrollbarv'>
          <ReleaseInfo date={'2023-05-10'} content={
            ` * Added copy to edit button, to edit prev messages and restart conversation. \n\n` +
            `![edit btn image](/assets/releases/edit_btn.png)\n\n`
          }/>
          <ReleaseInfo date={'2023-05-09'} content={
            ` * Added copy to clipboard button, for generated content \n\n` +
            `![Copy btn image](/assets/releases/copy_btn.jpg)\n\n` +
            ` * Fixed the Share button, and the favourite button \n\n` +
            `![Share and Favourite btn image](/assets/releases/fav-share_btn.jpg)`
          }/>
          <ReleaseInfo date={'2023-05-08'} content={
            ` * Releases Pages link in About Dialog \n`+
            ` * Add support for shift+enter or alt+enter in add a new line in the chatbox \n`+
            `* Added \`Regenerate\` button \n\n`+
            `![Regenerate](/assets/releases/regenrate_btn.jpg)`}/>
          <ReleaseInfo date={'2023-05-06'} content={`Updated UI`}/>
          <ReleaseInfo date={'2023-05-04'} content={`Release to all`}/>
          <ReleaseInfo date={'2023-04-28'} content={`Release to beta users`}/>
          <ReleaseInfo date={'2023-04-24'} content={`SSO integration`}/>
          <ReleaseInfo date={'2023-04-17'} content={`First demo release to LT`}/>
        </Box>
      </Box>
  </Paper>);
}

function ReleaseInfo(props:{date:string, content: string}) {
  return <Grid container spacing={2}>
    <Grid item xs={12} sm={3}>
      <ReactMarkdown
        skipHtml={false}
        remarkPlugins={[gfm]}
        children={props.date}/>
    </Grid>
    <Grid item xs={12} sm={9}>
      <ReactMarkdown
        skipHtml={false}
        remarkPlugins={[gfm]}
        children={props.content}/>
    </Grid>
  </Grid>
}

export default ReleasesPage;

