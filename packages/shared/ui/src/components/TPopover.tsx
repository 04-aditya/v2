import * as React from 'react';
import Popover from '@mui/material/Popover';
import { PaperProps } from '@mui/material';


type TPopoverProps =  {
  element: (onClick:(event: React.MouseEvent<HTMLElement>)=>void, did?:string)=>React.ReactNode,
  children?: React.ReactNode,
  onClose?: ((event: unknown, reason: "backdropClick" | "escapeKeyDown") => void)
  PaperProps?: PaperProps;
}

export default function TPopover(props:TPopoverProps) {
  const {element, onClose, ...rest} = props;
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
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
    <>
      {element(handleClick, id)}
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
        PaperProps={props.PaperProps}
      >
        {props.children}
      </Popover>
    </>
  );
}
