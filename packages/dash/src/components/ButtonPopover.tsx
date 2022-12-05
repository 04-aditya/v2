import * as React from 'react';
import Popover from '@mui/material/Popover';
import Button, { ButtonProps } from '@mui/material/Button';
import { IconButton } from '@mui/material';


type ButtonPopoverProps = ButtonProps & {
  icon?: React.ReactNode,
  buttonContent?: React.ReactNode,
  onClose?: ((event: unknown, reason: "backdropClick" | "escapeKeyDown") => void)
}

export default function ButtonPopover(props:ButtonPopoverProps) {
  const {icon, buttonContent,onClose, ...rest} = props;
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (event: unknown, reason: "backdropClick" | "escapeKeyDown") => {
    setAnchorEl(null);
    if (onClose) {
      onClose(event, reason);
    }
  };

  const open = Boolean(anchorEl);
  const id = open ? 'popover' : undefined;

  return (
    <div>
      {icon?<IconButton {...rest} aria-describedby={id} onClick={handleClick}>
        {icon}
      </IconButton>:<Button {...rest} aria-describedby={id} onClick={handleClick}>
        {props.buttonContent}
      </Button>}
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        {props.children}
      </Popover>
    </div>
  );
}
