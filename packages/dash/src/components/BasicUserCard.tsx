import React, {useMemo}  from 'react';
import { IUser } from 'sharedtypes';
import Avatar from '@mui/material/Avatar';
import Card, { CardProps } from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SchoolIcon from '@mui/icons-material/School';
import Skeleton from '@mui/material/Skeleton';
import EmailIcon from '@mui/icons-material/Email';
import { Row } from './RowColumn';
import { CardContent, Divider, ListItemIcon, Menu, MenuItem, Tooltip, Typography } from '@mui/material';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import { ITooltipParams } from 'ag-grid-community';


export function BasicUserCardTooltip(props: any) {
   const data: IUser|undefined = useMemo(()=>props.api?.getDisplayedRowAtIndex(props.rowIndex).data, []);

   return (
       <div style={{backgroundColor: 'white'}}>
           <BasicUserCard user={data}/>
       </div>
   );
};

export type BasicUserCardProps = CardProps & {
  user?:IUser
  elevation?:number
  sx?:CardProps['sx']
  onClick?:  (e: any) => void;
  options?: string[];
  size?: 'small'|'medium'|'large';
}

const BasicUserCard = (props:BasicUserCardProps)=>{
  const u=props.user;
  const [options, setOptions] = React.useState<string[]>(props.options??[])
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const showStats = options.includes('stats');
  const menuOpen = Boolean(anchorEl);
  const [isMouseOver, setMouseOver] = React.useState(false);
  const elevation = props.elevation??1;
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const toggleOption = (op: string)=>{
    if (options.includes(op)) {
      setOptions(options.filter(o=>o!==op));
    } else {
      setOptions([...options, op]);
    }
  }

  return <Card elevation={isMouseOver?elevation+2:elevation} sx={{ cursor: 'pointer',...props.sx}}
    onMouseOver={()=>setMouseOver(true)}
    onMouseOut={()=>setMouseOver(false)}
    onClick={props.onClick}>
    <CardHeader
      avatar={
        u?<Avatar sx={{ bgcolor: 'secondary.main'}} aria-label="profile image" variant='rounded'>
          {(u.first_name||u.email)[0].toUpperCase()}
        </Avatar>:<Skeleton variant='rectangular' width={40} height={40}/>
      }
      action={
        <Tooltip title='More options' onClick={handleMenuClick}>
          <IconButton aria-label="settings">
            <MoreVertIcon/>
          </IconButton>
        </Tooltip>
      }
      title={u?<Row><span>{u.first_name}&nbsp;{u.last_name}</span><IconButton size="small" aria-label='email' LinkComponent='a' href={`mailto:${u.email}`} ><EmailIcon fontSize='small' /></IconButton></Row>:<Skeleton variant='text' width={'36ch'} height='24'/>}
      subheader={<><Row spacing={1}>
        {u?<Typography variant='caption'>{u.business_title??''}</Typography>:<Skeleton variant="rectangular" width={30} height={24}/>}
        {u?<Avatar alt="cabability" sx={{width: 16, height: 16 , fontSize:12}}>{u.capability?u.capability[0]:''}</Avatar>:<Skeleton variant='circular' width={16} height={16}/>}
        {u?<Typography variant='caption'>{u.craft??''}</Typography>:<Skeleton variant='text' width='16ch'/>}
        <SchoolIcon sx={{width:16, height:16}}/>
      </Row>
      {/* <Row>
        <Typography variant='subtitle2'>roles...</Typography>
      </Row> */}
      </>}
    />
    {showStats?<CardContent sx={{py:0}}>

    </CardContent> : null}
    <Menu
        anchorEl={anchorEl}
        id="user-menu"
        open={menuOpen}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={e=>toggleOption('stats')}>
          <ListItemIcon>
          {options.includes('stats')? <CheckBoxIcon fontSize="small" /> : <CheckBoxOutlineBlankIcon fontSize="small" />}
          </ListItemIcon>
          Show Stats
        </MenuItem>
        <MenuItem>
          <Avatar /> My account
        </MenuItem>
        <Divider />
        {/* <MenuItem>
          <ListItemIcon>
            <PersonAdd fontSize="small" />
          </ListItemIcon>
          Add another account
        </MenuItem>
        <MenuItem>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        <MenuItem>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>*/}
      </Menu>
  </Card>
}

export default BasicUserCard;
