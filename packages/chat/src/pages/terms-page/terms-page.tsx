import { Box, Divider, Paper, Skeleton, Typography } from '@mui/material';
import styles from './terms-page.module.css';
import ReactMarkdown from 'react-markdown'

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
export function TermsNotice() {
  return <Box sx={{ p: 1, overflowY: 'scroll' }}>
    <ReactMarkdown>{`
**Usage Guidelines**


  AI solutions need to be used with appropriate business and legal involvement and review in the same manner as other creative work produced for publication.
  Creative and business teams should share the prompts used to generate any Output that is incorporated into any client-facing work at the time that such work is submitted to Legal for review and,
  as always, all work intended to be public-facing should be reviewed by Legal.

For Inputs:

- Do not use third party property, such as trademarks, property names (e.g. the *Mona Lisa*) or other identifiable third party intellectual property.
- Do not use personal names or other personal information.
- Do not use “in the style” of Inputs that include third party property (e.g. in the style of Andy Warhol), but can seek Outputs in a certain genre.
- Do not use Agency or Client confidential information. While the Inputs remain owned by the Agency, Azure Cognitive Services can use Inputs and Outputs for its internal use to develop and improve the Services, including sharing them with third party contractors
 (subject to confidentiality and security obligations) solely for data annotation purposes, with Azure Cognitive Services being
 responsible for all actions and omissions of such contractors. Agency also agrees to provide anonymized user
 interaction and engagement data with image Output provided by the Azure Cognitive Services API, as requested by Azure Cognitive Services, which Azure Cognitive Services
 may use to develop and improve the Services.

Regardless of the Input, if the Output is suggestive of or substantially similar to an existing work, person, or third party property, the risks of using the Output should be evaluated.

**Important license**:

  - Do not use the Services in an unlawful manner, for any illegal purpose, or in any manner inconsistent with the Enterprise Agreement, applicable law or for any purpose other than as expressly permitted in the Enterprise Agreement;
  - Do not use the Services in violation of technical documentation, usage guidelines or other requirements provided by OpenAI;
  - Do not use the Services in a manner that infringes OpenAI’s or Azure Congitive Services intellectual property rights or to create derivative works or develop competing products or services;
  - Do not use any method to extract data from the Services other than as permitted through the API;
  - Do not represent to any person that output from the Services was human-generated and
  - Do not use the Services to generate spam, for content for dissemination in electoral campaigns, for content that encourages violence, terrorism, or other serious harm.

`}</ReactMarkdown>
    <Typography variant='body2'>PSChat uses Azure OpenAI services at the backend please read <a href='https://learn.microsoft.com/en-us/azure/cognitive-services/openai/faq'>Azure Cognitive Services FAQ</a> to determine if this is acceptable for your use case.</Typography>
    TBD..
    <Skeleton width="100%" height={20} animation="wave" />
    <Skeleton width="80%" height={20} animation="wave" />
    <Skeleton width="90%" height={20} animation="wave" />
    <Skeleton width="100%" height={20} animation="wave" />
    <Skeleton width="80%" height={20} animation="wave" />
    <Skeleton width="100%" height={20} animation="wave" />
    <Skeleton width="80%" height={20} animation="wave" />
    <Skeleton width="90%" height={20} animation="wave" />
    <Skeleton width="100%" height={20} animation="wave" />
    <Skeleton width="80%" height={20} animation="wave" />
    <Skeleton width="90%" height={20} animation="wave" />
    <Skeleton width="100%" height={20} animation="wave" />
    <Skeleton width="80%" height={20} animation="wave" />
    <Skeleton width="100%" height={20} animation="wave" />
    <Skeleton width="80%" height={20} animation="wave" />
    <Skeleton width="90%" height={20} animation="wave" />
    <Skeleton width="80%" height={20} animation="wave" />
    <Skeleton width="90%" height={20} animation="wave" />
    <Skeleton width="100%" height={20} animation="wave" />
    <Skeleton width="80%" height={20} animation="wave" />
    <hr/>
    <Typography variant='body2'>
      By accessing this website we assume you accept these terms and conditions in full.
      Do not continue to use PS Chat application's website if you do not accept all of the terms and conditions stated on this page.
    </Typography>
  </Box>;
}

