import { Box, Typography } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

export function TermsNotice() {
  return <Box sx={{ p: 1, overflowY: 'scroll' }}>
    <ReactMarkdown rehypePlugins={[rehypeRaw]}>{`
Thanks for using PSChat! Our mission is to unleash your creativity and productivity with the help of an assistant powered by Generative AI.
Use of this PS Chat is governed by the following rules and guidelines:

* Don't give any personal information (yours, clients’, or others) in your queries (i.e., prompts or other inputs) to PSChat.
* <span style="color:#fe414d;">Only use the output in ways that are allowed by your client contract or for internal use.</span>
* Don't use PSChat to do anything that could harm Publicis Groupe's reputation, or to make any harmful content (e.g., malware or spam).
* Don't pretend or imply that any outputs from PSChat were made by a human. Include a disclosure where possible, indicating outputs are AI-generated.
* Check the accuracy of the content that PSChat generates (text, software code, images, etc.), and don't use it if it's inaccurate or might infringe on others' rights.
* If in doubt, talk it out! Please reach out to your manager, the legal team, or the Global Security Office if you have any questions. This is a new and evolving tool – there are no dumb questions.

Our [Employee Privacy Policy](https://lion.app.box.com/v/PG-Staff-HR-PrivacyNotice) explains how we collect and use your information,
our [Acceptable Use Guidelines](https://lion.box.com/v/AIAcceptableUse) outline your responsibilities when using our Services,
and our [Security & Data Privacy Policies](https://lion.box.com/v/DataPrivacyAndSecurityPolicies) explain our overall security and privacy program policies.
Please click agree below only if you agree with all these and the rules above.
`}</ReactMarkdown>
    <Typography variant='body2'>PSChat uses Azure OpenAI services at the backend please read <a href='https://learn.microsoft.com/en-us/azure/cognitive-services/openai/faq'>Azure Cognitive Services FAQ</a> to determine if this is acceptable for your use case.</Typography>
    <hr />
    <Typography variant='body2'>
      By accessing this website we assume you accept these terms and conditions in full.
      Do not continue to use PS Chat application's website if you do not accept all of the terms and conditions stated on this page.
    </Typography>
  </Box>;
}
