import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog, { DialogProps } from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';;


type GenericDialogProps = DialogProps & {
  title?: React.ReactNode,
  children?: React.ReactNode,
  open?: boolean,
  idprefix?: string,
  onClose?: ()=>void;
}

export default function GenericDialog(props: GenericDialogProps) {
  const [open, setOpen] = React.useState(props.open);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  const handleClose = () => {
    setOpen(false);
    if (props.onClose) props.onClose();
  };

  return (
    <div>
      <Dialog
        fullScreen={fullScreen}
        open={open}
        onClose={handleClose}
        aria-labelledby={`${props.idprefix||''}-dialog-title`}
      >
        <DialogTitle id={`${props.idprefix||''}-dialog-title`}>
          {props.title}
        </DialogTitle>
        <DialogContent>
          {props.children}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} autoFocus>
            Ok
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
