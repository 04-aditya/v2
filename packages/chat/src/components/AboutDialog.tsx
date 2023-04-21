import React from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Skeleton, Typography, useMediaQuery } from "@mui/material";
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import InfoIcon from '@mui/icons-material/Info';
import { useTheme } from "sharedui/theme";
import ReactMarkdown from "react-markdown";

export function AboutDialog() {
  const [open, setOpen] = React.useState(false);
  const { theme } = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <ListItemButton onClick={handleClickOpen}>
        <ListItemIcon>
          <InfoIcon />
        </ListItemIcon>
        <ListItemText primary={`About ${process.env['NX_APP_NAME']}`} />
      </ListItemButton>
      <Dialog
        fullScreen={fullScreen}
        open={open}
        onClose={handleClose}
        aria-labelledby="about-dialog-title"
      >
        <DialogTitle id="about-dialog-title">
          <img src='/assets/appicon.svg' alt="pschat application logo" width="22px" /> {`About ${process.env['NX_APP_NAME']}`}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            PS Chat - An AI ChatBot for Publicis Sapient employees.<br />
            <ReactMarkdown>{`
Thanks for using PSChat! Our mission is to unleash your creativity and productivity by providing you with a helpful assistant powered by
Generative AI. We do so by providing an intuitive chatbot app that allows you to provide prompts and get responses from large language
models such as ChatGPT. You can use PSChat, but you need to follow security and privacy rules, as well as any laws that apply.

Rules you must follow:

* Don't give any personal information (yours or others) in your requests to PSChat.
* If you're using PSChat on behalf of a client, make sure you follow their rules and directions, written or otherwise.
* Don't use PSChat to do anything that could harm Publicis Groupe's reputation, or to make harmful content like malware or spam.
* Don't pretend that the output from PSChat was made by a human.
* Check the accuracy and copyright of the content that PSChat generates, and don't use it if it's inaccurate or infringes on others' rights.
* Only use the output in ways that are allowed by your client contract or for internal use.

Our [Employee Privacy Policy](https://lion.app.box.com/v/PG-Staff-HR-PrivacyNotice) explains how we collect and use your information,
our [Acceptable Use Guidelines](https://lion.box.com/v/AIAcceptableUse) outline your responsibilities when using our Services,
and our [Security & Data Privacy Policies](https://lion.box.com/v/DataPrivacyAndSecurityPolicies) explain our overall security and privacy program policies.
Please click agree below only if you agree with all these and the rules above.


            `}</ReactMarkdown>
            <br/><br/><br/>
            <Typography variant="caption">for any queries,
              please contact <a href="mailto:rakesh.ravuri@publicissapient.com">mailto:rakesh.ravuri@publicissapient.com</a>
            </Typography>
            <br />
            <Typography variant="caption">
              build date: {process.env['NX_BUILD_DATE']}, version: {process.env['NX_BUILD_VERSION']}
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} autoFocus>
            Ok
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
