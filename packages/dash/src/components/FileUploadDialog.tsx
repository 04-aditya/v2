import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
  Input,
  InputLabel,
  FormControl,
  FormHelperText,
  ButtonProps,
  Alert,
} from '@mui/material';
import FileUpload from "react-mui-fileuploader";

interface FileUploadButtonProps extends ButtonProps {
  title: string;
  onUpload: (file: File[], otherFields?: any) => void;
  fileExts?: string[];
  acceptedType?: string;
  children?: React.ReactNode;
  buttonContent?: React.ReactNode;
}
export const FileUploadButton: React.FC<FileUploadButtonProps> = (props) => {
  const {title, onUpload, fileExts, acceptedType, children, buttonContent='Upload', ...rest} = props;
  const [open, setOpen] = React.useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string|undefined>();


  const onClose = () => setOpen(false);

  const handleFileUploadError = (error:any) => {
    // Do something...
  }

  const handleFilesChange = (files:any) => {
    // Do something...
    console.log(files);
    setFiles(files);
  }

  const handleUpload = () => {
    if (!files || files.length === 0) {
      setError('Please select or drag a file to upload');
      return;
    }
    onUpload(files);
    setOpen(false);
  };
  return <>
    <Button {...rest} onClick={()=>setOpen(true)}>{buttonContent}</Button>
    <Dialog open={open} onClose={()=>{setOpen(false)}} sx={{minWidth:400}}>
      <DialogContent>
        <FileUpload
          getBase64={false}
          multiFile={true}
          disabled={false}
          title={title}
          header="[Drag to drop]"
          leftLabel="or"
          rightLabel="to select files"
          buttonLabel="click here"
          buttonRemoveLabel="Remove all"
          maxFileSize={10}
          maxUploadFiles={0}
          maxFilesContainerHeight={357}
          acceptedType={acceptedType}
          errorSizeMessage={'fill it or remove it to use the default error message'}
          allowedExtensions={fileExts}
          onFilesChange={handleFilesChange}
          onError={handleFileUploadError}
          imageSrc={'/assets/upload.png'}
          BannerProps={{ elevation: 0, variant: "outlined" }}
          onContextReady={context => {
            // access to component context here
          }}
          ContainerProps={{
            elevation: 0,
            variant: "elevation",
            sx: { p: 0 }
          }}
          PlaceholderImageDimension={{
            xs: { width: 128, height: 128 },
            sm: { width: 128, height: 128 },
            md: { width: 164, height: 164 },
            lg: { width: 256, height: 256 }
          }}
        />
        <hr/>
        {children}
        {error?<Alert severity='error'>{error}</Alert>:null}

      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} >
          Cancel
        </Button>
        <Button onClick={handleUpload} color="primary">
          Upload
        </Button>
      </DialogActions>
    </Dialog>
  </>
}
