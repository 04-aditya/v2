import ButtonPopover from '@/components/ButtonPopover';
import { Row } from '@/components/RowColumn';
import { Box, Button, MenuItem, Paper, Select, TextField, Typography } from '@mui/material';
import { useForm, Controller, SubmitHandler } from "react-hook-form"
import { IConfigItem } from 'sharedtypes';
import useAxiosPrivate from 'psnapi/useAxiosPrivate';

interface IConfigFormInput {
  name: string
  type: string
  details: string
}

export default function AddOrUpdateConfig({value, onChange, label}: {value?: IConfigItem, onChange:(data:IConfigItem)=>void, label?:string}) {
  const axios  = useAxiosPrivate();
  const { control, handleSubmit } = useForm({
    defaultValues: {
      name: "",
      type: "json"  ,
      details: "{}",
    },
    values: {
      name: value?.name||'',
      type: value?.type||'json',
      details: JSON.stringify(value?.details),
    },
  })
  const onSubmit: SubmitHandler<IConfigFormInput> = (data) => {
    console.log(data)

    axios.post(`/api/admin/config/${value?value.id:''}`, {
      name: data.name,
      type: data.type,
      details: JSON.parse(data.details),
    })
      .then(res=>{
        onChange(res.data.data as IConfigItem);
      })
      .catch(ex=>{
        console.error(ex);
      });
  }

  return <ButtonPopover size='small' variant='outlined' buttonContent={label||(value?'Update':'Add')}>
  <Paper sx={{minWidth:300, minHeight:250, p: 2}}>
    <Typography>{value?'Update':'Add a new'} config item</Typography>
    <hr/>
    <Box component={'form'} onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="name"
        control={control}
        render={({ field }) => <TextField {...field} label='Name' fullWidth sx={{mb:1}}/>}
      />
      <Controller
        name="type"
        control={control}
        render={({ field }) => (
          <Select fullWidth
            {...field} sx={{mb:1}} label='Type'
          >
            <MenuItem value={'json'}>JSON</MenuItem>
            <MenuItem value={'stat'}>Stat</MenuItem>
          </Select>
        )}
      />
      <Controller
        name="details"
        control={control}
        render={({ field }) => <TextField multiline rows={3} {...field} label='Details' fullWidth sx={{mb:1}}/>}
      />
      <hr/>
      <Row spacing={1}>
        <Button type='submit'>{value?'Update':'Add'}</Button>
      </Row>
    </Box>
  </Paper>
</ButtonPopover>
}
