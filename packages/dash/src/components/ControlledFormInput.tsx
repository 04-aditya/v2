import TextField, { TextFieldProps } from "@mui/material/TextField";
import React from "react";

import { Control, FieldValues, useController, useForm } from "react-hook-form";

export interface ControlledFormInputProps<T extends FieldValues> {
  control: Control<T,any>;
  name: string;
  fieldProps?: TextFieldProps
}

export default function ControlledFormInput<T extends FieldValues>(props:ControlledFormInputProps<T>) {
  const {
    field: { onChange, onBlur, name, value, ref },
    fieldState: { invalid, isTouched, isDirty },
    formState: { touchedFields, dirtyFields }
  } = useController<T,any>({
    name:props.name,
    control:props.control,
    rules: { required: true },
    //defaultValue: props.defaultValue||"",
  });

  return (
    <TextField
      {...props.fieldProps}
      onChange={onChange} // send value to hook form
      onBlur={onBlur} // notify when input is touched/blur
      value={value} // input value
      name={name} // send down the input name
      inputRef={ref} // send input ref, so we can focus on input when error appear
    />
  );
}
