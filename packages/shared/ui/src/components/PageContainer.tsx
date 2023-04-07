import * as React from 'react';
import Box, { BoxProps } from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import CloseIcon from '@mui/icons-material/Close';
import { appstateDispatch } from 'sharedui/hooks/useAppState';
import { Backdrop, CircularProgress, Typography } from '@mui/material';
import { Stack } from '@mui/system';


interface PageContainerProps extends BoxProps {
  title?: string;
  isBusy?: boolean;
  busyMessage?: string;
  children?: React.ReactNode;
  error?: React.ReactNode;
}

export function PageContainer(props: PageContainerProps) {
  const [errorOpen, setErrorOpen] = React.useState(false);
  const isBusy = props.isBusy?true:false;
  React.useEffect(() => {
    appstateDispatch({type:'title', data:props.title});
  }, [props.title]);

  React.useEffect(()=>{
    setErrorOpen(!!props.error);
  }, [props.error])

  return <Box sx={props.sx||{m:1}}>
    <Collapse in={errorOpen}>
      <Alert
        severity='error'
        action={
          <IconButton
            aria-label="close"
            color="inherit"
            size="small"
            onClick={() => {
              setErrorOpen(false);
            }}
          >
            <CloseIcon fontSize="inherit" />
          </IconButton>
        }
        sx={{ mb: 2 }}
      >
        {props.error}
      </Alert>
    </Collapse>
    {props.children}
    <Backdrop
      sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
      open={isBusy}
    >
      <Stack direction='column' spacing={1} alignItems='center'>
        <CircularProgress color="inherit" />
        {props.busyMessage && <Typography variant='caption'>{props.busyMessage}</Typography>}
      </Stack>
    </Backdrop>
  </Box>;
}
