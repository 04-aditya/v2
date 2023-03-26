import {ForwardedRef, forwardRef, Ref, useEffect, useRef, useState} from 'react';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent, SelectProps } from '@mui/material/Select';
import FormHelperText from '@mui/material/FormHelperText';

// interface StdSelectProps<T> extends SelectProps<T> {
//   value?: T;
//   onChange?: (event: SelectChangeEvent<T>, child: React.ReactNode) => void;
//   options: Array<T>;
//   getOptionLabel: (option:T) => string;
//   isOptionEqualToValue?: (option:T, value:T) => boolean
// }

// export default function StdSelect<T>(props: StdSelectProps<T>  ) {

//   const [value, setValue] = useState<T>();
//   const [position, setPosition] = useState(0);
//   const inputComponent = useRef<HTMLInputElement>(null);

//   useEffect(() => {
//     setPosition(inputComponent.current? (inputComponent.current.getBoundingClientRect().left + 30): 0);
//   }, [inputComponent]);

//   useEffect(()=>{
//     setValue(props.value);
//   }, [props.value])

//   const handleChange = (event: SelectChangeEvent<T>, child: React.ReactNode) => {
//     setValue(event.target.value);
//     if (props.onChange) props.onChange(event.target.value, child);
//   };

//   return (
//       <FormControl sx={{width: 200}}>
//         {/* Supplies text for label */}
//         {value ? <InputLabel id="custom-select-label">Score</InputLabel> : ''}
//         <Select
//           ref={inputComponent}
//           labelId="custom-select-label"
//           id="custom-select"
//           value={value}
//           label={value ? props.label : ""} //This tells Select to have gap in border
//           onChange={handleChange}
//           displayEmpty
//           renderValue={(value) => value ? props.getOptionLabel(value) : <em>Nothing Selected</em>}
//           MenuProps={{
//             PaperProps: {sx: {left: `${position}px !important`}}
//           }}
//           {...props}
//         >
//           {/*Don't add a placeholder, instead use renderValue to control emptry value text */}
//           {props.options.map((option) => {
//             return <MenuItem value={option}>{props.getOptionLabel(option)}</MenuItem>
//           })}
//         </Select>
//         <FormHelperText sx={{marginLeft: 0}}>With TypeScript!</FormHelperText>
//       </FormControl>
//   );
// };
