import React, { useEffect, useState } from 'react';
import { Box, Button, Card, CardActions, CardContent, CardHeader, CardMedia, Divider, Grid, LinearProgress, Paper, Skeleton, Stack, Typography } from '@mui/material';
import styles from './files-page.module.css';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import DriveFolderUploadIcon from '@mui/icons-material/DriveFolderUpload';
import PermMediaIcon from '@mui/icons-material/PermMedia';
import { useChatFiles } from '../../api/chat';
import { DataGrid, GridColDef, GridRenderCellParams, GridRowSelectionModel, GridCallbackDetails} from '@mui/x-data-grid';
import { format, parseISO, } from 'date-fns';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import ImageListItemBar from '@mui/material/ImageListItemBar';
import ListSubheader from '@mui/material/ListSubheader';
import IconButton from '@mui/material/IconButton';
import InfoIcon from '@mui/icons-material/Info';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { useNavigate } from 'react-router-dom';
import useAxiosPrivate from 'psnapi/useAxiosPrivate';

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

const columns: GridColDef[] = [
  { field: 'name', headerName: 'Name'},
  { field: 'timestamp', headerName: 'Timestamp', type: 'date', valueGetter: (params:any) => parseISO(params.value), width: 150 },
  { field: 'url', headerName: 'URL', width: -1,
    renderCell:(params:GridRenderCellParams<Date>)=><a href={params.value}>{params.value}</a> },
]
function ChatFileList() {
  const axios = useAxiosPrivate();
  const [paginationModel, setPaginationModel] = React.useState({
    pageSize: 25,
    page: 0,
  });
  const {data: files, invalidateCache} = useChatFiles('file',paginationModel.pageSize*paginationModel.page, paginationModel.pageSize);
  const [selectedFiles, setSelectedFiles] = useState<Array<any>>([]);
  useEffect(()=> setSelectedFiles([]), [files])
  const onRowSelectionModelChange = (rowSelectionModel: GridRowSelectionModel, details: GridCallbackDetails) => {
    if (!files) return;
    setSelectedFiles([...rowSelectionModel].map(i=>files[i as number]))
  }

  const onDelete = async ()=>{
    for await (const file of selectedFiles) {
      try {
        console.log('Deleting: ' + file.url);
        const ar = await axios.delete(file.url);
      } catch (ex) {
        console.log('Error deleting: ' + file.url);
        console.log(ex);
      }
    }
    invalidateCache();
  }

  return <Box sx={{width:'100%', minHeight:100}}>
    <Stack direction="row" spacing={1}>
      <Button onClick={onDelete} disabled={selectedFiles.length===0}>Delete</Button>
    </Stack>
    <Divider/>
    {files?<div style={{ height: '100%', width: '100%' }}>
      <DataGrid
        rows={files.map((f,i)=>({...f, id: i}))}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 25 },
          },
        }}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        checkboxSelection
        disableRowSelectionOnClick
        onRowSelectionModelChange={onRowSelectionModelChange}
      />
    </div>:<LinearProgress/>}
  </Box>;
}

function ChatImagesList() {
  const axios = useAxiosPrivate();
  const navigate = useNavigate();
  const {data: files, isLoading, invalidateCache} = useChatFiles('images',0,50);
  const [deletedFiles, setDeletedFiles] = React.useState<string[]>([]);

  const onDelete = async (url:string) => {
    const ar = await axios.delete(url);
    if (ar.status===200) {
      setDeletedFiles([...deletedFiles, url]);
    }
  }
  return <Box sx={{display:'flex', flexWrap:'wrap', flexDirection:'row', width:'100%'}}>
    {isLoading?<LinearProgress sx={{width:'100%'}}/>:null}
    {files?.map((item) =>deletedFiles.indexOf(item.url)===-1?<Card key={item.url} sx={{ maxWidth: 345, m:1 }} elevation={4}
      onClick={()=>(item.metadata.sessionid?navigate(`/chat/${item.metadata.sessionid}`):null)}>
      <CardMedia
        sx={{ height: 200 }}
        image={item.url}
        title={format(parseISO(item.timestamp+''),'do MMM yyyy')}
      />
      <CardContent sx={{maxHeight: 140}}>
        <Typography gutterBottom variant="button" component="div">{format(parseISO(item.timestamp+''),'do MMM yyyy')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {item.metadata.prompt||''}
        </Typography>
      </CardContent>
      <CardActions>
        <IconButton aria-label="Delete image" onClick={()=>{onDelete(item.url)}}>
          <DeleteForeverIcon />
        </IconButton>
      </CardActions>
    </Card>:null)}
    {/* <ImageList sx={{ width: 500,}}>
      <ImageListItem key="Subheader" cols={2}>
        <ListSubheader component="div">Generated Images</ListSubheader>
      </ImageListItem>
      {files?.map((item) => (
        <ImageListItem key={item.url}>
          <img
            src={item.url}
            alt={item.name}
            loading="lazy"
          />
          <ImageListItemBar
            title={item.name}
            subtitle={format(parseISO(item.timestamp+''),'Do MMM yyyy')}
            actionIcon={
              <IconButton
                sx={{ color: 'rgba(255, 255, 255, 0.54)' }}
                aria-label={`info about ${item.name}`}
              >
                <InfoIcon />
              </IconButton>
            }
          />
        </ImageListItem>
      ))}
    </ImageList> */}
  </Box>
}

