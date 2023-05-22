import { Alert, Box, Grid, IconButton, Snackbar, Stack, Typography } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import gfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coy, okaidia } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useEffect, useState } from 'react';
import { useTheme as useThemeMode } from 'sharedui/theme';
import rehypeRaw from "rehype-raw";
import rehypeColorChips from 'rehype-color-chips';
import rehypeExternalLinks from 'rehype-external-links';
import mermaid from 'mermaid';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ImageIcon from '@mui/icons-material/Image';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';

function CodeContent(args: any) {
  const { mode } = useThemeMode();
  const [svg, setSvg] = useState<string>('');
  const { node, inline, className, children, partial, ...props } = args;
  const match = /language-(\w+)/.exec(className || '');
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [showImage, setShowImage] = useState(false);

  const handleSnackbarClose = (event: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }

    setSnackbarMessage('')
  };

  const showSnackbar = (msg: string)=>{
    setSnackbarMessage(msg);
  }

  useEffect(() => {
    if (className === 'language-mermaid' && !partial) {
      const mcode = `%%{
  init: {
    'theme': ${mode === 'dark' ? 'dark' : 'default'}, 'htmlLabels': true
  }
}%%

` + [...children].join('');
      // console.log(mcode);
      mermaid.render('mermaid-svg', mcode)
        .then(res => {
          setSvg(res.svg);
        });
      setShowImage(true);
    }
  }, [partial, className, children, mode]);

  const snackbarcomponent = <Snackbar
    anchorOrigin={{ vertical:'top', horizontal:'center' }}
    open={snackbarMessage !== ''}
    autoHideDuration={6000}
    onClose={handleSnackbarClose}>
    <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%' }}>
      {snackbarMessage}
    </Alert>
  </Snackbar>;

  const copybutton = <IconButton
    size='small'
    onClick={() => {
      navigator.clipboard.writeText(showImage?svg:String(children));
      showSnackbar(`Copied ${showImage?'svg image':match && match[1]} code to clipboard`);
    }}>
    <ContentCopyIcon fontSize={'small'}/>
  </IconButton>

  if (className === 'language-llm-observation') {
    return <Box sx={{ p: 1, backgroundColor: '#e8e8e8' }}>
      <Typography variant='body2'>{children}</Typography>
    </Box>;
  }
  if (className === 'language-mermaid' && !partial) {
    return <Box
      sx={{ position:'relative', border:'1px solid #ccc', overflow:'auto',p:0,m:0,
      borderRadius:'4px', boxShadow:' inset 0 -3em 3em rgba(0, 0, 0, 0.1), 0 0 0 2px rgb(255, 255, 255), 0.3em 0.3em 1em rgba(0, 0, 0, 0.3);'}}>
      {snackbarcomponent}
      <Box>
        {showImage?<div dangerouslySetInnerHTML={{ __html: svg }} />:<SyntaxHighlighter
          {...props}
          children={String(children).replace(/\n$/, '')}
          style={mode === 'dark' ? okaidia : coy}
          language={'mermaid'}
          PreTag="div" />}
      </Box>
      <Stack direction={'row'} spacing={1} alignItems={'center'} justifyContent={'space-between'}
        sx={theme=>({position:'absolute', top:0, right:0, minHeight:'24px', minWidth:'80px', background:theme.palette.background.default,
          border:'1px solid #ccc', borderTopWidth:0, borderRightWidth:0,borderRadius:'0px 4px 0px 4px'})}
      >
        <IconButton size='small' onClick={() => {setShowImage(p=>!p)}}>
          {showImage? <TextSnippetIcon/> :<ImageIcon />}
        </IconButton>
        {copybutton}
      </Stack>
      {/* <Grid container>
        <Grid item xs={12} sm={6}>
          <div dangerouslySetInnerHTML={{ __html: svg }} />
        </Grid>
        <Grid item xs={12} sm={6}>

        </Grid>
      </Grid> */}
    </Box>;
  }

  return !inline && match ? (
    <Box sx={{ position:'relative', border:'1px solid #ccc', borderRadius:'4px', boxShadow:' inset 0 -3em 3em rgba(0, 0, 0, 0.1), 0 0 0 2px rgb(255, 255, 255), 0.3em 0.3em 1em rgba(0, 0, 0, 0.3);'}}>
      <Snackbar
        anchorOrigin={{ vertical:'top', horizontal:'center' }}
        open={snackbarMessage !== ''}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
      <SyntaxHighlighter
        {...props}
        children={String(children).replace(/\n$/, '')}
        style={mode === 'dark' ? okaidia : coy}
        language={match[1]}
        PreTag="div" />
      <Stack direction={'row'} spacing={1} alignItems={'center'} justifyContent={'space-between'}
        sx={theme=>({position:'absolute', top:0, right:0, minHeight:'24px', minWidth:'80px', background:theme.palette.background.default,
          border:'1px solid #ccc', borderTopWidth:0, borderRightWidth:0,borderRadius:'0px 4px 0px 4px'})}
      >
        <Typography variant='caption' sx={{p:1}}>{match[1]}</Typography>
        {copybutton}
      </Stack>
    </Box>
  ) : (<>
    {className}
    <code {...props} className={className}>
      {children}
    </code>
  </>
  );
}
const csscolor = new RegExp(/[#]([a-fA-F\d]{6}|[a-fA-F\d]{3})/gi);
export function MarkDown(props: any) {
  const partial = props.partial;
  let text = props.children as string;
  text = text.replace(csscolor, '`#$1`');
  return <ReactMarkdown children={text} className='message-content'
    skipHtml={false}
    remarkPlugins={[gfm]}
    components={{
      code: (props) => <CodeContent {...props} partial={partial} />,
      img: ({ node, ...props }) => <img style={{ maxWidth: '40%' }} {...props} />,
    }}
    rehypePlugins={[
      rehypeRaw,
      [rehypeExternalLinks, { rel: ['nofollow'] }],
      [rehypeColorChips, { customClassName: 'color-chip' }]
    ]} />;
}
