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

interface FileUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File) => void;
  fileTypes: string[];
}

export const FileUploadDialog: React.FC<FileUploadDialogProps> = (props) => {
  const { open, onClose, onUpload, fileTypes } = props;
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }
    console.log(selectedFile.type);
    // if (!fileTypes.includes(selectedFile.type)) {
    //   setError(`Invalid file type. Allowed types: ${fileTypes.join(', ')}`);
    //   return;
    // }
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setError('');
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const selectedFile = event.dataTransfer.files?.[0];
    if (!selectedFile) {
      setError('Please drag a file onto the dialog to upload');
      return;
    }
    console.log(selectedFile.type);
    // if (!fileTypes.includes(selectedFile.type)) {
    //   setError(`Invalid file type. Allowed types: ${fileTypes.join(', ')}`);
    //   return;
    // }
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setError('');
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleUpload = () => {
    if (!file) {
      setError('Please select or drag a file to upload');
      return;
    }
    onUpload(file);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <DialogTitle>Upload File</DialogTitle>
      <DialogContent>
        <DialogContentText>
          To upload a file, select a file from your computer or drag a file onto
          the dialog and click "Upload".
        </DialogContentText>
        <form>
          <FormControl>
          <InputLabel htmlFor="file-upload">File</InputLabel>
            <Input
              id="file-upload"
              type="file"
              onChange={handleFileChange}
              error={Boolean(error)}
            />
            <FormHelperText>{error}</FormHelperText>
          </FormControl>
          <TextField
            label="File Name"
            value={fileName}
            InputProps={{ readOnly: true }}
            margin="normal"
            fullWidth
          />
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        <Button onClick={handleUpload} color="primary">
          Upload
        </Button>
      </DialogActions>
    </Dialog>
  );
};


interface FileUploadButtonProps extends ButtonProps {
  title: string;
  onUpload: (file: File[]) => void;
  fileExts?: string[];
  acceptedType?: string;
}
export const FileUploadButton: React.FC<FileUploadButtonProps> = (props) => {
  const {title, onUpload, fileExts, acceptedType, ...rest} = props;
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
    <Button {...rest} onClick={()=>setOpen(true)}>Upload</Button>
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
