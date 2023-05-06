import React from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Skeleton, Typography, useMediaQuery } from "@mui/material";
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import InfoIcon from '@mui/icons-material/Info';
import { useTheme } from "sharedui/theme";
import ReactMarkdown from "react-markdown";
import { TermsNotice } from "./TermsNotice";

export function AboutDialog(props:{showText:boolean}) {
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
      <ListItemButton onClick={handleClickOpen} sx={{maxHeight:'48px'}}>
        <ListItemIcon>
          <InfoIcon />
        </ListItemIcon>
        {props.showText && <ListItemText primary={`About ${process.env['NX_APP_NAME']}`} />}
      </ListItemButton>
      <Dialog
        fullScreen={fullScreen}
        open={open}
        onClose={handleClose}
        aria-labelledby="about-dialog-title"
        PaperProps={{
          sx: {maxWidth:'800px'}
        }}
      >
        <DialogTitle id="about-dialog-title">
          <img src='/assets/appicon.svg' alt="pschat application logo" width="22px" /> {`About ${process.env['NX_APP_NAME']}`}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            PSChat - LLM powered ChatBot for Publicis Sapient employees.<br />
            <TermsNotice/>
            <br/>
            <Typography variant="caption">for any queries,
              please contact <a href="mailto:psnextsupport@publicissapient.com">mailto:psnextsupport@publicissapient.com</a>
            </Typography>
            <br />
            <Typography variant="caption">for any bugs or support requests,
              please log a ticket <a href=" https://tools.publicis.sapient.com/jira/servicedesk/customer/portal/752">PS Chat support portal</a>
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
