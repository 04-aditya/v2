import * as React from 'react';
import { Typography } from '@mui/material';


interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
}

export function PageHeader(props: PageHeaderProps) {
  return <>
    <Typography variant='h5'>{props.title}</Typography>
    {props.subtitle?<Typography variant='body1'>{props.subtitle}</Typography>:null}
  </>;
}
