import React from 'react';
import Box from '@mui/material/Box';


export function a11yProps(prefix:string, index: number) {
  return {
    id: `${prefix}-tab-${index}`,
    'aria-controls': `${prefix}-tabpanel-${index}`,
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  idprefix?: string;
}
export function TabPanel(props: TabPanelProps) {
  const { children, value, index, idprefix, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`${idprefix}-tabpanel-${index}`}
      aria-labelledby={`${idprefix}-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 1 }}>
          {children}
        </Box>
      )}
    </div>
  );
}
