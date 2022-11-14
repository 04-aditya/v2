import * as React from 'react';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import { string } from 'yup';

export type HItemData = {
  id: string;
  label: string;
  value: number;
  children: Array<HItemData>
}

export function updateHTreeData(data:HItemData, id: string, value:number):HItemData {
  const newdata = {...data};
  if (data.id===id) {
    setItemValue(newdata, value);
  }
  else if (data.children) {
    newdata.children = newdata.children.map(itm=>updateHTreeData(itm,id,value));
  }
  newdata.value = getItemValue(newdata);
  return newdata;
}

type HTreeItemProps = {
  data: HItemData
  onChange?: (id:string, value:number)=>void
}

function getItemValue(item:HItemData) {
  if (item.children.length===0) return item.value;
  let s=0;
  let us=0;
  item.children.forEach(c=>{ const v=getItemValue(c); if(v===1){s++;} else if(v===-1) {us++;}});
  if (s===item.children.length) return 1;
  if (us===item.children.length) return -1;
  return 0;
}

function setItemValue(item:HItemData, value:number) {
  item.value = value;
  if (value!==0) {
    item.children = item.children.map(itm=>setItemValue(item, value))
  }
  return item;
}

// const onDataChange = ({data, event, onChange}:{data:HItemData,event:React.ChangeEvent<HTMLInputElement>, onChange?:(data:HItemData)=>void})=>{
//   if (onChange) {
//     const newData:HItemData = {label: data.label, value: event.target.checked?1:-1, children:[]};
//     newData.children = data.children.map(itm=>setItemValue(itm, newData.value));
//     onChange(newData);
//   }
// }

const HTreeItem = (props:HTreeItemProps)=>{
  const [checked, setChecked] = React.useState(false);
  const [indeterminate, setIndeterminate] = React.useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setChecked(event.target.checked);
    setIndeterminate(false);
    if (props.onChange)
      props.onChange(props.data.id, (event.target.checked?1:-1));
  };

  React.useEffect(() => {
    const v = getItemValue(props.data);
    if (v===1) {
      setChecked(true);
      setIndeterminate(false);
    } else if (v===-1) {
      setChecked(false);
      setIndeterminate(false);
    } else {
      setChecked(false);
      setIndeterminate(true);
    }
  },[props.data]);


  const children = (props.data.children && props.data.children.length)?<Box sx={{ display: 'flex', flexDirection: 'column', ml: 3 }}>
    <HTree data={props.data.children} onChange={props.onChange} />
  </Box>:null;

  return <div>
    <FormControlLabel
      label={props.data.label}
      control={
        <Checkbox
          checked={checked}
          indeterminate={indeterminate}
          onChange={handleChange}
        />
      }
    />
    {children}
  </div>
}

export type HTreeProps = {
  data: Array<HItemData>,
  onChange?: (id:string, value: number)=>void,
}

const HTree = (props: HTreeProps)=>{
  return <>
    {props.data.map(d=><HTreeItem key={d.id} data={d} onChange={props.onChange}/>)}
  </>
}

export default HTree;
