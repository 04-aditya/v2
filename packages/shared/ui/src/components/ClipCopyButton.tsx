
import { IconButtonProps, IconButton, Snackbar } from '@mui/material';
import React, { useState } from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface ClipCopyButtonProps extends IconButtonProps {
  text: string;
  message?: string;
}

export const ClipCopyButton: React.FC<ClipCopyButtonProps> = (props) => {
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    navigator.clipboard.writeText(props.text);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div>
      <IconButton {...props} onClick={handleClick}>
        <ContentCopyIcon />
      </IconButton>
      <Snackbar
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        open={open}
        onClose={handleClose}
        message={props.message||`Copied to clipboard`}
      />
    </div>
  );
};

