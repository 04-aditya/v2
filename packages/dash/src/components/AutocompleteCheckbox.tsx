import * as React from 'react';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { StyledComponentProps } from '@mui/material';

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

interface AutocompleteCheckboxProps<T> {
  options: Array<T>;
  placeholder?: string;
  label?: string;
  id?: string;
  style?: React.CSSProperties,
  value: T[] | undefined;
  onChange: (event: React.SyntheticEvent, value: T[]) => void;
  getOptionLabel: (option: T) => string;
};
export default function AutocompleteCheckbox<T>(props: AutocompleteCheckboxProps<T>) {
  return (
    <Autocomplete size='small'
      multiple
      id={props.id}
      options={props.options}
      disableCloseOnSelect
      value={props.value}
      onChange={props.onChange}
      getOptionLabel={props.getOptionLabel}
      renderOption={(rprops, option, { selected }) => (
        <li {...rprops}>
          <Checkbox
            icon={icon}
            checkedIcon={checkedIcon}
            style={{ marginRight: 8 }}
            checked={selected}
          />
          {props.getOptionLabel(option)}
        </li>
      )}
      style={props.style}
      renderInput={(params) => (
        <TextField {...params} label={props.label} placeholder={props.placeholder} />
      )}
    />
  );
}
