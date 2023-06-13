import { Box, Card, CardContent, CardHeader, Divider, Grid, Paper, Skeleton } from '@mui/material';
import styles from './releases-page.module.css';
import { format, formatDistanceToNow, parse } from 'date-fns';
import { MarkDown } from '../../components/MarkDown';

/* eslint-disable-next-line */
export interface ReleasesPageProps {}

export function ReleasesPage(props: ReleasesPageProps) {
  return (
    <Paper elevation={2}
      sx={{display:'flex', height:'100%', flexDirection:'column', p:{xs:0, sm:1}}}>
      <h3>Release History for PS Chat application</h3>
      <Divider/>
      <br/>
      <Box sx={theme=>({maxWidth:{xs:'100%', sm:'600'}, overflowY:'scroll', height:'100hv', background: theme.palette.background.default})}>
        {/* <ReleaseInfo date={'**Date**'} content={'**Description**'}/>
        <Divider/> */}
        <Box sx={theme=>({maxHeight:'600px', p:3})} className='scrollbarv'>
        <ReleaseInfo date={'2023-06-13'} content={
            ` * Enabled API access option. \n\n` +
            `\t![developer](/assets/releases/developer.png)\n\n` +
            `\t![PAT tab](/assets/releases/pat.png)\n\n` +
            `\n\n`
          }/>
        <ReleaseInfo date={'2023-05-28'} content={
            ` * Added GPT4 model option. \n\n` +
            `\t![gpt4 model option](/assets/releases/gpt4.png)\n\n` +
            ` * Added comand palatte on press on '/' as the first character in the message box. \n\n` +
          `\t![command palette](/assets/releases/cmdpalette.png)\n\n` +
          ` * Added /web command , to ask PSChat to use web search results as context. \n\n` +
        `\t![/web command](/assets/releases/cmd_web.png)\n\n\t![web reasoning](/assets/releases/cmd_web_reason.png)\n\n` +
            `\n\n`
          }/>
        <ReleaseInfo date={'2023-05-20'} content={
            ` * Added copy to clipboard button to the generated code sections. \n\n` +
            `\t![copy code button](/assets/releases/code_copy.png)\n\n` +
            ` * Added option to switch between diagram and code the generated \`mermaid\` code sections. \n` +
            ` the copy button copies \`mermaid\` code or the svg diagram code based on what is visible. \n\n` +
          `\t![copy code button](/assets/releases/code_image_switch.png)\n\n` +
            `\n\n`
          }/>
          <ReleaseInfo date={'2023-05-19'} content={
            ` * Added session now removes ignores oldest messages so that the token limit is not exhausted, the messages that are not not used are marked in the UI. \n\n` +
            `\t![skipped count image](/assets/releases/skippedcount.png)\n\n` +
            `\n\n`
          }/>
          <ReleaseInfo date={'2023-05-18'} content={
            ` * Added ability to auto continue and complete the response when it detects that it clipped the response for \`GPT3.5 Turbo\` model. \n\n` +
            ` * Made the chat rest call async, this will give PsChat the ability to interact with user for inputs. \n\n` +
            `\n\n`
          }/>
          <ReleaseInfo date={'2023-05-17'} content={
            ` * Added cability to generate images using DALLE as a tool. \n\n` +
            `\t![add instruction btn image](/assets/releases/dalle.png)\n\n`
          }/>
          <ReleaseInfo date={'2023-05-16'} content={
            ` * Added cability to add new system instructions. \n\n` +
            `\t![add instruction btn image](/assets/releases/add_sysinst.png)\n\n`
          }/>
          <ReleaseInfo date={'2023-05-15'} content={
            ` * Initial release of the Reasoning model with websearch tools. \n\n` +
            `\t![websearch](/assets/releases/modelwithtools.png)\n\n` +
            ` * Added display of intermediate reasoning steps. \n\n` +
            `\t![intermediate reasoning image](/assets/releases/intermediate_reasoning.png)\n\n`
          }/>
          <ReleaseInfo date={'2023-05-10'} content={
            ` * Added copy to edit button, to edit prev messages and restart conversation. \n\n` +
            `\t![edit btn image](/assets/releases/edit_btn.png)\n\n`
          }/>
          <ReleaseInfo date={'2023-05-09'} content={
            ` * Added copy to clipboard button, for generated content \n\n` +
            `\t![Copy btn image](/assets/releases/copy_btn.jpg)\n\n` +
            ` * Fixed the Share button, and the favourite button \n\n` +
            `\t![Share and Favourite btn image](/assets/releases/fav-share_btn.jpg)`
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
      <MarkDown>{props.content}</MarkDown>
    </CardContent>
  </Card>
}

export default ReleasesPage;

