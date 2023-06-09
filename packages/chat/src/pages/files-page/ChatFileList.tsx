import React, { SyntheticEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Divider, LinearProgress, Stack, useTheme } from '@mui/material';
import { useChatFiles } from '../../api/chat';
import { DataGrid, GridRowSelectionModel, GridCallbackDetails } from '@mui/x-data-grid';
import useAxiosPrivate from 'psnapi/useAxiosPrivate';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { parseISO } from 'date-fns';
import Dropzone, { useDropzone } from 'react-dropzone';



const columns: GridColDef[] = [
  { field: 'name', headerName: 'Name'},
  { field: 'timestamp', headerName: 'Timestamp', type: 'date', valueGetter: (params:any) => parseISO(params.value), width: 150 },
  { field: 'url', headerName: 'URL', width: -1,
    renderCell:(params:GridRenderCellParams<Date>)=><a href={params.value}>{params.value}</a> },
]

export function ChatFileList() {
  const theme = useTheme();
  const axios = useAxiosPrivate();
  const [paginationModel, setPaginationModel] = React.useState({
    pageSize: 25,
    page: 0,
  });
  const { data: files, invalidateCache } = useChatFiles('file', paginationModel.pageSize * paginationModel.page, paginationModel.pageSize);
  const [selectedFiles, setSelectedFiles] = useState<Array<any>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  useEffect(() => setSelectedFiles([]), [files]);
  const {acceptedFiles, getRootProps, getInputProps, isFocused, isDragAccept, isDragReject} = useDropzone({
    accept:{
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/html': ['.htm', '.html']
    }
  });

  const style:any = useMemo(()=>{

    const baseStyle = {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      borderWidth: 2,
      borderRadius: 2,
      borderColor: '#eeeeee',
      borderStyle: 'dashed',
      backgroundColor: '#fafafa',
      color: '#bdbdbd',
      outline: 'none',
      transition: 'border .24s ease-in-out'
    };

    const focusedStyle = {
      borderColor: theme.palette.primary.light
    };

    const acceptStyle = {
      borderColor: theme.palette.success.light
    };

    const rejectStyle = {
      borderColor: theme.palette.error.light
    };

    return {
      ...baseStyle,
      ...(isFocused ? focusedStyle : {}),
      ...(isDragAccept ? acceptStyle : {}),
      ...(isDragReject ? rejectStyle : {})
    };
  },[
    theme,
    isFocused,
    isDragAccept,
    isDragReject
  ]);

  const onRowSelectionModelChange = (rowSelectionModel: GridRowSelectionModel, details: GridCallbackDetails) => {
    if (!files)
      return;
    setSelectedFiles([...rowSelectionModel].map(i => files[i as number]));
  };

  const onDelete = async () => {
    try {
      setIsProcessing(true);
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
    } catch (ex) {
      console.error(ex);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpload = async ()=>{
    try {
      console.log('started input processing');
      const filesToUpload=Object.keys(acceptedFiles);
      if (filesToUpload.length) {
        setIsProcessing(true);
        for await (const fname of acceptedFiles) {
          console.log(fname)
            //setFiles(files=>({...files, [fname]: {file: file.file, status: 'processing'}}));
            const formData = new FormData();
            formData.append("file", fname);
            const ar = await axios.post(`/api/chat/upload`, formData, {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            })
        }
        acceptedFiles.length=0;
        invalidateCache();
      }
    } catch(ex) {
      console.error(ex);
    } finally {
      setIsProcessing(false);
    }
  }

  return <Box sx={{ width: '100%', minHeight: 100 }}>
    <Stack direction="row" spacing={1}>
      <Button onClick={onDelete} disabled={selectedFiles.length === 0}>Delete</Button>
      <Box sx={{width:48}}/>
      {isProcessing ? <LinearProgress sx={{ flexGrow: 1 }} /> : (acceptedFiles.length>0?<Button onClick={handleUpload}>Upload {acceptedFiles.length} files(s)</Button>:<Box sx={theme=>({flexGrow: 1})}>
        <div
          {...getRootProps({
            style,
            className: 'dropzone',
            // onDrop: (event:SyntheticEvent) => {
            //   console.log(event);
            // }
          })}
        >
          <input {...getInputProps()} />
          <p>Drag 'n' drop some files here, or click to select files to upload</p>
        </div>
      </Box>)}
    </Stack>
    <Divider />
    {files ? <div style={{ height: '100%', width: '100%' }}>
      <DataGrid
        rows={files.map((f, i) => ({ ...f, id: i }))}
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
        onRowSelectionModelChange={onRowSelectionModelChange} />
    </div> : <LinearProgress />}
  </Box>;
}
