import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
//import { coy } from "react-syntax-highlighter/dist/styles/prism";

function CodeBlock(props: {value: string,language?: string}) {
  const { language, value } = props;
  return (
    <SyntaxHighlighter language={language}>
      {value}
    </SyntaxHighlighter>
  );
}

export default CodeBlock;
