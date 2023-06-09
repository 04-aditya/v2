import React from 'react';
import { Box, Card, CardActions, CardContent, CardMedia, LinearProgress, Typography } from '@mui/material';
import { useChatFiles } from '../api/chat';
import { format, parseISO } from 'date-fns';
import IconButton from '@mui/material/IconButton';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { useNavigate } from 'react-router-dom';
import useAxiosPrivate from 'psnapi/useAxiosPrivate';

export function ChatImagesList() {
  const axios = useAxiosPrivate();
  const navigate = useNavigate();
  const { data: files, isLoading, invalidateCache } = useChatFiles('images', 0, 50);
  const [deletedFiles, setDeletedFiles] = React.useState<string[]>([]);

  const onDelete = async (url: string) => {
    const ar = await axios.delete(url);
    if (ar.status === 200) {
      setDeletedFiles([...deletedFiles, url]);
    }
  };
  return <Box sx={{ display: 'flex', flexWrap: 'wrap', flexDirection: 'row', width: '100%' }}>
    {isLoading ? <LinearProgress sx={{ width: '100%' }} /> : null}
    {files?.map((item) => deletedFiles.indexOf(item.url) === -1 ? <Card key={item.url} sx={{ maxWidth: 345, m: 1 }} elevation={4}
      onClick={() => (item.metadata.sessionid ? navigate(`/chat/${item.metadata.sessionid}`) : null)}>
      <CardMedia
        sx={{ height: 200, Width: 140, }}
        image={item.url}
        title={format(parseISO(item.timestamp + ''), 'do MMM yyyy')} />
      <CardContent sx={{ maxHeight: 140, }}>
        <Typography gutterBottom variant="button" component="div">{format(parseISO(item.timestamp + ''), 'do MMM yyyy')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {item.metadata.prompt || ''}
        </Typography>
      </CardContent>
      <CardActions>
        <IconButton aria-label="Delete image" onClick={() => { onDelete(item.url); }}>
          <DeleteForeverIcon />
        </IconButton>
      </CardActions>
    </Card> : null)}
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
  </Box>;
}
