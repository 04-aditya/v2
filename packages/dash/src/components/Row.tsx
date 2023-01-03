import { Stack, StackProps } from "@mui/material";


export const Row: React.FC<StackProps> = (props) => {
  return <Stack alignItems={'center'} {...props} direction={'row'}/>
}
