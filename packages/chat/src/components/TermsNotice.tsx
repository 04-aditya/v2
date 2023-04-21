import { Box, Typography } from '@mui/material';
import ReactMarkdown from 'react-markdown';

export function TermsNotice() {
  return <Box sx={{ p: 1, overflowY: 'scroll' }}>
    <ReactMarkdown>{`
Thanks for using PSChat! Our mission is to unleash your creativity and productivity by providing you with a helpful assistant powered by
Generative AI. We do so by providing an intuitive chatbot app that allows you to provide prompts and get responses from large language
models such as ChatGPT. You can use PSChat, but you need to follow security and privacy rules, as well as any laws that apply.

Rules you must follow:

* Don't give any personal information (yours or others) in your requests to PSChat.
* If you're using PSChat on behalf of a client, make sure you follow their rules and directions, written or otherwise. Please check in with your legal support contact to understand any requirements in your client contracts.
* Don't use PSChat to do anything that could harm Publicis Groupe's reputation, or to make harmful content like malware or spam.
* Don't pretend that the output from PSChat was made by a human.
* Check the accuracy and copyright of the content that PSChat generates, and don't use it if it's inaccurate or might infringe on others' rights.
* Only use the output in ways that are allowed by your client contract or for internal use.
* If in doubt, talk it out! Please reach out to your manager, the legal team or the Global Security Office if you have any questions. This is a new and evolving tool - there are no dumb questions.

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
