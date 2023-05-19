import { Box, Grid, Typography } from '@mui/material';
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

function CodeContent(args: any) {
  const { mode } = useThemeMode();
  const [svg, setSvg] = useState<string>('');
  const { node, inline, className, children, partial, ...props } = args;
  const match = /language-(\w+)/.exec(className || '');

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
    }
  }, [partial, className, children, mode]);

  if (className === 'language-llm-observation') {
    return <Box sx={{ p: 1, backgroundColor: '#e8e8e8' }}>
      <Typography variant='body2'>{children}</Typography>
    </Box>;
  }
  if (className === 'language-mermaid' && !partial) {
    return <Grid container>
      <Grid item xs={12} sm={6}>
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <pre>{children}</pre>
      </Grid>
    </Grid>;
  }

  return !inline && match ? (
    <SyntaxHighlighter
      {...props}
      children={String(children).replace(/\n$/, '')}
      style={mode === 'dark' ? okaidia : coy}
      language={match[1]}
      PreTag="div" />
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
