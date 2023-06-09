import React from 'react';
import { Box, CardHeader, Grid, Paper, Skeleton } from '@mui/material';
import styles from './files-page.module.css';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import DriveFolderUploadIcon from '@mui/icons-material/DriveFolderUpload';
import PermMediaIcon from '@mui/icons-material/PermMedia';
import { GridColDef, GridRenderCellParams} from '@mui/x-data-grid';
import { parseISO, } from 'date-fns';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import ImageListItemBar from '@mui/material/ImageListItemBar';
import ListSubheader from '@mui/material/ListSubheader';
import InfoIcon from '@mui/icons-material/Info';
import { ChatImagesList } from '../../components/ChatImagesList';
import { ChatFileList } from './ChatFileList';

/* eslint-disable-next-line */
export interface FilesPageProps {}

export default function FilesPage(props: FilesPageProps) {
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Paper elevation={2}
      sx={{display:'flex', height:'100%', flexDirection:'column', p:{xs:0, sm:1}}}>
      <Tabs value={value} onChange={handleChange} aria-label="icon label tabs example">
        <Tab icon={<DriveFolderUploadIcon />} label="Uploads" />
        <Tab icon={<PermMediaIcon />} label="Images" />
      </Tabs>
      <Box sx={theme=>({maxWidth:{xs:'100%', sm:'600'}, overflowY:'scroll', flex:1, background: theme.palette.background.default})}>
        {/* <ReleaseInfo date={'**Date**'} content={'**Description**'}/>
        <Divider/> */}
        <Box sx={theme=>({maxHeight:'100%', p:3})} className='scrollbarv'>
          {value===0 ? <ChatFileList/>: null}
          {value===1 ? <ChatImagesList/>: null}
        </Box>
      </Box>
  </Paper>);
}
