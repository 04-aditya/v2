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
> It’s our Groupe position that employees are free to use any emerging tools to speed the development of pitches, strategies, concepts, POCs,
> perspectives or thought leadership for our clients’ consumption. However, when considering how to implement these ideas for
> public consumption there are limitations and risks.
>

> Currently only OpenAI toolsets should be considered for direct consumer engagement with AI experiences and AI output.
> That means text from GPT, images from Dalle, code from Codex and speech to text from Whisper are approved go to market solutions.
>
>
> Due to the legal landscape surrounding AI, these solutions do need to be used with appropriate business and legal involvement
> and review in the same manner as other creative work produced for publication.
            `}</ReactMarkdown>
            <Skeleton width="100%" height={20} animation="wave" />
            <Skeleton width="80%" height={20} animation="wave" />
            <Skeleton width="90%" height={20} animation="wave" />
            <Typography variant="caption">for any queries,
              please contact <a href="mailto:rakesh.ravuri@publicissapient.com">mailto:rakesh.ravuri@publicissapient.com</a>
            </Typography>
            <br />
            <Typography variant="caption">
              Please read the <a href='/terms' style={{ color: 'inherit' }}><strong>terms of service</strong></a>
              &nbsp;&amp;&nbsp;
              <a href='https://lion.app.box.com/v/PG-Staff-HR-PrivacyNotice/file/1177190323591' style={{ color: 'inherit' }} target="_blank" rel="noreferrer"><strong>privacy policy</strong></a> for the acceptable usage guidelines.
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
