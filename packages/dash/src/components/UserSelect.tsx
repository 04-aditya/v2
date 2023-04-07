import * as React from 'react';
import Box from '@mui/material/Box';
import { IUser, getUserName } from 'sharedtypes';
import { CircularProgress, ListItem, ListItemText, MenuItem } from '@mui/material';
import { createFilterOptions } from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Autocomplete, { autocompleteClasses } from '@mui/material/Autocomplete';
import useMediaQuery from '@mui/material/useMediaQuery';
import ListSubheader from '@mui/material/ListSubheader';
import Popper from '@mui/material/Popper';
import { useTheme, styled } from '@mui/material/styles';
import { VariableSizeList, ListChildComponentProps } from 'react-window';
import Typography from '@mui/material/Typography';
import { string } from 'yup';
import { useAllUsers } from 'psnapi/users';


const LISTBOX_PADDING = 8; // px

function renderRow(props: ListChildComponentProps) {
  const { data, index, style } = props;
  const dataSet = data[index];
  const inlineStyle = {
    ...style,
    top: (style.top as number) + LISTBOX_PADDING,
    borderBottom: '1px solid #e0e0e0',
  };

  if (dataSet.hasOwnProperty('group')) {
    return (
      <ListSubheader key={dataSet.key} component="div" style={inlineStyle}>
        {dataSet.group}
      </ListSubheader>
    );
  }

  return (
    <ListItem {...dataSet[0]} style={inlineStyle} sx={{m:1}}>
      <ListItemText primary={getUserName(dataSet[1]).substring(0,25)} secondary={(dataSet[1].business_title||'').substring(0,32)+'...'}/>
    </ListItem>
    // <li {...dataSet[0]}>
    //   <Typography noWrap style={inlineStyle}>
    //     {getUserName(dataSet[1])}
    //   </Typography>
    //   <Typography noWrap variant='caption' style={inlineStyle}>
    //     {dataSet[1].business_title}
    //   </Typography>
    // </li>
  );
}

const OuterElementContext = React.createContext({});

const OuterElementType = React.forwardRef<HTMLDivElement>((props, ref) => {
  const outerProps = React.useContext(OuterElementContext);
  return <div ref={ref} {...props} {...outerProps} />;
});

function useResetCache(data: any) {
  const ref = React.useRef<VariableSizeList>(null);
  React.useEffect(() => {
    if (ref.current != null) {
      ref.current.resetAfterIndex(0, true);
    }
  }, [data]);
  return ref;
}

// Adapter for react-window
const ListboxComponent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLElement>
>(function ListboxComponent(props, ref) {
  const { children, ...other } = props;
  const itemData: React.ReactChild[] = [];
  (children as React.ReactChild[]).forEach(
    (item: React.ReactChild & { children?: React.ReactChild[] }) => {
      itemData.push(item);
      itemData.push(...(item.children || []));
    },
  );

  const theme = useTheme();
  const smUp = useMediaQuery(theme.breakpoints.up('sm'), {
    noSsr: true,
  });
  const itemCount = itemData.length;
  const itemSize = smUp ? 48 : 56;

  const getChildSize = (child: React.ReactChild) => {
    if (child.hasOwnProperty('group')) {
      return 48;
    }

    return itemSize;
  };

  const getHeight = () => {
    if (itemCount > 8) {
      return 8 * itemSize;
    }
    return itemData.map(getChildSize).reduce((a, b) => a + b, 0);
  };

  const gridRef = useResetCache(itemCount);

  return (
    <div ref={ref}>
      <OuterElementContext.Provider value={other}>
        <VariableSizeList
          itemData={itemData}
          height={getHeight() + 2 * LISTBOX_PADDING}
          width="100%"
          ref={gridRef}
          outerElementType={OuterElementType}
          innerElementType="ul"
          itemSize={(index) => getChildSize(itemData[index])}
          overscanCount={5}
          itemCount={itemCount}
        >
          {renderRow}
        </VariableSizeList>
      </OuterElementContext.Provider>
    </div>
  );
});

const StyledPopper = styled(Popper)({
  [`& .${autocompleteClasses.listbox}`]: {
    boxSizing: 'border-box',
    '& ul': {
      padding: 0,
      margin: 0,
    },
  },
});



interface UserSelectProps {
  id?: string;
  "aria-describedby"?: string,
  label?: string,
  fullWidth?: boolean,
  users?: IUser[];
  onChange: (event: any, user:IUser|null)=>void;
  value: IUser|null;
}
export default function UserSelect(props: UserSelectProps) {
  const {data: allUsers} = useAllUsers();
  const {users, onChange, value} = props;
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const options = React.useMemo(()=>{
    const newuser: IUser = {id:-1, first_name:'New', last_name:'User', email:'newuser@example.com', business_title:'...', roles: []} ;
    if (users)
      return [newuser, ...users.sort((a,b)=> (a.first_name||'').localeCompare(b.first_name||'')).filter(u=>((u.first_name||'.')[0] !== '.' ? u : null ) )];
    else if (allUsers)
      return [newuser, ...allUsers.sort((a,b)=> (a.first_name||'').localeCompare(b.first_name||'')).filter(u=>((u.first_name||'.')[0] !== '.' ? u : null ) )];
    else
      return [newuser];
  }, [users, allUsers]);
  const filterOptions = createFilterOptions({
    matchFrom: 'start',
    stringify: (option: IUser) => getUserName(option),
  });
  return (
    <Autocomplete filterOptions={filterOptions}
      id={props.id||"user-select"} aria-describedby={props["aria-describedby"]||"user-selection"}
      sx={{ width: props.fullWidth?'100%':300 }}
      disableListWrap
      PopperComponent={StyledPopper}
      ListboxComponent={ListboxComponent}
      value={value}
      onChange={onChange}
      inputValue={inputValue}
      onInputChange={(event, newInputValue) => {
        setInputValue(newInputValue);
      }}
      options={options}
      groupBy={(user) => (user.first_name||' ')[0].toUpperCase()}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      getOptionLabel={getUserName}
      // renderOption={(props, user) => (
      //   <Box key={user.id} component="li" sx={{ '& > img': { mr: 2, flexShrink: 0 } }} {...props}>
      //     {getUserName(user)}
      //   </Box>
      // )}
      renderOption={(props, option, state) =>
        [props, option, state] as React.ReactNode
      }
      // TODO: Post React 18 update - validate this conversion, look like a hidden bug
      renderGroup={(params) => params as unknown as React.ReactNode}
      open={open}
      onOpen={() => {
        setOpen(true);
      }}
      onClose={() => {
        setOpen(false);
      }}
      // loading={loading}
      renderInput={(params) => (
        <TextField
          {...params}
          label={props.label}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <React.Fragment>
                {/* {loading ? <CircularProgress color="inherit" size={20} /> : null} */}
                {params.InputProps.endAdornment}
              </React.Fragment>
            ),
          }}
        />
      )}
    />
  );
}
