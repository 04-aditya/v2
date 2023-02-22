import * as React from 'react';
import Box from '@mui/material/Box';
import Slider, { SliderProps } from '@mui/material/Slider';
import {setISOWeek, addWeeks, format} from 'date-fns'


function valuetext(value: number) {
  return `${value}°C`;
}

type WeekSpliderProps = SliderProps & {
  year: number;
}
export default function WeekSlider(props: WeekSpliderProps) {
  const {year, sx, ...otherProps} = props;
  const marks = React.useMemo(()=>{
    const m = [];
    let date = setISOWeek(Date.UTC(year,0,1), 0)
    for (let i=1; i<=52; i++) {
      m.push({value: i, label: format(date, 'MMM dd')});
      date = addWeeks(date, 1);
    }
    return m;
   }, [year]);
  return (
    <Box sx={sx || { width: '100%' }}>
      <Slider
        aria-label="week of the year slider"
        defaultValue={1}
        getAriaValueText={valuetext}
        min={1}
        max={52}
        step={1}
        marks={marks}
        valueLabelDisplay="auto"
      />
    </Box>
  );
}
