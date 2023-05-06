import * as React from 'react';
import Chip, { ChipPropsVariantOverrides } from '@mui/material/Chip';
import Autocomplete from '@mui/material/Autocomplete';
import TextField, { StandardTextFieldProps } from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import { SxProps } from '@mui/material';

export class TagsProps {
  id?: string;
  options: string[] = [];
  defaultValue?: string[];
  variant?: StandardTextFieldProps["variant"] = 'standard';
  label?: string;
  placeholder?: string;
  sx?: SxProps;
  fullWidth?: boolean = false;
}

export default function TagsTextField(props: TagsProps) {
  return (
      <Autocomplete fullWidth={props.fullWidth}
        multiple size='small'
        id={props.id}
        options={props.options}
        defaultValue={props.defaultValue}
        freeSolo
        sx={props.sx}
        renderTags={(value: readonly string[], getTagProps) =>
          value.map((option: string, index: number) => (
            <Chip variant={'outlined'} label={option} {...getTagProps({ index })} />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            variant={props.variant}
            label={props.label}
            placeholder={props.placeholder}
          />
        )}
      />
  );
}
