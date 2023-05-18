import * as React from 'react';
import { emphasize, styled } from '@mui/material/styles';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Chip from '@mui/material/Chip';
import HomeIcon from '@mui/icons-material/Home';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const StyledBreadcrumb = styled(Chip)(({ theme }) => {
  const backgroundColor =
    theme.palette.mode === 'light'
      ? theme.palette.background.default
      : theme.palette.background.default;
  return {
    backgroundColor,
    height: theme.spacing(3),
    color: theme.palette.text.primary,
    fontWeight: theme.typography.fontWeightRegular,
    '&:hover, &:focus': {
      backgroundColor: emphasize(backgroundColor, 0.06),
    },
    '&:active': {
      boxShadow: theme.shadows[1],
      backgroundColor: emphasize(backgroundColor, 0.12),
    },
  };
}) as typeof Chip; // TypeScript only: need a type cast here because https://github.com/Microsoft/TypeScript/issues/26591

function handleClick(event: React.MouseEvent<Element, MouseEvent>) {
  event.preventDefault();
  console.info('You clicked a breadcrumb.');
}

export interface ChatCmd {
  name: string;
  label: string;
  icon?: React.ReactElement<any, string | React.JSXElementConstructor<any>>;
}

export interface CmdListProps {
  commands: ChatCmd[];
  onClick: (event: React.MouseEvent<Element, MouseEvent>, cmd: ChatCmd) => void;
}

export default function ChatCmdList(props: CmdListProps) {
  return (
    <div role="presentation" onClick={handleClick}>
      <Breadcrumbs aria-label="breadcrumb">
        {props.commands.map(c=><StyledBreadcrumb
          variant='outlined'
          component="span"
          label={c.name}
          icon={c.icon}
        />)}
      </Breadcrumbs>
    </div>
  );
}
