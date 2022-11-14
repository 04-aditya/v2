import TextField, { TextFieldProps } from "@mui/material/TextField";
import React from "react";


const DTextField = (props:TextFieldProps)=>{

  const {size='small', ...otherProps} = props;
  return <TextField size={size}
    {...otherProps}/>
}

export default DTextField;
