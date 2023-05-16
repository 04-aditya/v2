import { Box, Card, CardContent, CardHeader, Divider, Grid, Paper, Skeleton } from '@mui/material';
import styles from './releases-page.module.css';
import { ReactMarkdown } from 'react-markdown/lib/react-markdown';
import gfm from 'remark-gfm';
import { format, formatDistanceToNow, parse } from 'date-fns';

/* eslint-disable-next-line */
export interface ReleasesPageProps {}

export function ReleasesPage(props: ReleasesPageProps) {
  return (
    <Paper elevation={2}
      sx={{display:'flex', height:'100%', flexDirection:'column', p:{xs:0, sm:1}}}>
      <h3>Release History for PS Chat application</h3>
      <Divider/>
      <br/>
      <Box sx={theme=>({maxWidth:{xs:'100%', sm:'600'}, height:'100hv', background: theme.palette.background.default})}>
        {/* <ReleaseInfo date={'**Date**'} content={'**Description**'}/>
        <Divider/> */}
        <Box sx={theme=>({maxHeight:'600px', p:2})} className='scrollbarv'>
          <ReleaseInfo date={'2023-05-16'} content={
            ` * Added cability to add new system instructions. \n\n` +
            `![add instruction btn image](/assets/releases/add_sysinst.png)\n\n` +
            ` * Added display of intermediate reasoning steps. \n\n` +
            `![intermediate reasoning image](/assets/releases/intermediate_reasoning.png)\n\n`
          }/>
          <ReleaseInfo date={'2023-05-15'} content={
            ` * Initial release of the Reasoning model with websearch tools. \n\n` +
            `![websearch](/assets/releases/modelwithtools.png)\n\n`
          }/>
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
  const date = parse(props.date,'yyyy-MM-dd', new Date());
  return <Card sx={{mb:3}} elevation={4}>
    <CardHeader title={format(date,'do MMM yyyy')} subheader={formatDistanceToNow(date,{addSuffix: true})}/>
    <CardContent>
      <ReactMarkdown
        skipHtml={false}
        remarkPlugins={[gfm]}
        children={props.content}/>
    </CardContent>
  </Card>
}

export default ReleasesPage;

