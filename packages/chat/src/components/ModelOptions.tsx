import { SelectChangeEvent, Grid, FormControl, InputLabel, Select, ListSubheader, MenuItem, Divider, OutlinedInput, Checkbox, ListItemText, IconButton, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Button, Input, TextField, useTheme, useMediaQuery, Autocomplete, Box } from "@mui/material";
import { useState, useEffect, Dispatch, SetStateAction, SyntheticEvent } from "react";
import { useChatModels } from "../api/chat";
import { MenuProps } from "./MenuProps";
import Tooltip from '@mui/material/Tooltip';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
const defaultprompt = (actas:string) => `You are a helpful AI assistant. If you do not know the answer to a question, respond by saying "I do not know the answer to your question.". ${actas}
Respond in markdown format when possible.code parts should start with \`\`\`langauge and end with \`\`\` . if asked for uml generate mermaid code and start the mermaid code with \`\`\`mermaid .`;


interface ISystemMessage {
  name: string;
  message: string;
  type: string;
}
const defaultSystemMessages: Array<ISystemMessage> = [
  {name:'AI Assistant', type:'default', message: defaultprompt('')},
  {name:'Senior Software Engineer', type:'Engineering', message: defaultprompt('Act as a senior software engineer.')},
  {name:'AI Reviewer', type:'Engineering', message: defaultprompt('Act as an AI reviewer. You will be reviewing code and providing feedback on the code. Respond in markdown format when possible')},
  {name:'AI Architect', type:'Engineering', message: defaultprompt('Act as an AI architect. You will be designing and implementing systems and applications. I will provide some details about the functionality of an application or other digital product, and it will be your job to come up with ways to integrate it into the IT landscape. This could involve analyzing business requirements, performing a gap analysis and mapping the functionality of the new system to the existing IT landscape. Next steps are to create a solution design, a physical network blueprint, definition of interfaces for system integration and a blueprint for the deployment environment. ')},
  {name:'Senior Experience designer', type:'Experience', message: defaultprompt('Act as a senior experience or UX designer')},
  {name:'Marketing Writing Assistant', type:'Marketing', message: defaultprompt('Act as a marketing writing assistant. You help come up with creative content ideas and content like marketing emails, blog posts, tweets, ad copy and product descriptions. You write in a friendly yet professional tone but can tailor your writing style that best works for a user-specified audience.')},
  {name:'Senior Product Manager', type:'Product', message: defaultprompt('Act as a senior product manager.')},
];

export default function SelectSystemMessage(props:{
  id?: string,
  label?: string,
  value?:ISystemMessage,
  options:ISystemMessage[],
  onChange:(value:ISystemMessage|null)=>void,
  onDelete:(value:ISystemMessage)=>void
}) {
  const [value, setValue] = useState<ISystemMessage | null>(props.value||props.options[0]);
  const [inputValue, setInputValue] = useState('');

  return (
    <Autocomplete fullWidth size='small'
      value={value}
      onChange={(event, newValue) => {
        const value = newValue || props.options[0];
        setValue(value);
        if (!newValue) setInputValue(value.name);
        props.onChange(value);
      }}
      inputValue={inputValue}
      onInputChange={(event, newInputValue) => {
        setInputValue(newInputValue);
      }}
      id={props.id||"systemmessages-select"}
      options={props.options}
      getOptionLabel={op=>op.name}
      groupBy={(option) => option.type}
      renderInput={(params) => <TextField {...params} label={props.label||"Act as"} />}
      renderOption={(rprops, option) => (
        <MenuItem dense value={option.message} sx={{width:'100%'}} {...rprops}>
          <Stack direction='row' alignItems='center' justifyContent={'space-between'} spacing={1}>
            <Tooltip title={option.message} arrow>
              <span>{option.name}</span>
            </Tooltip>
            {option.type==='Custom' && <IconButton size='small' onClick={()=>props.onDelete(option)}>
              <DeleteForeverIcon/>
            </IconButton>}
          </Stack>
        </MenuItem>
      )}
    />
  );
}
export interface IModelOptions {
  model:string,
  assistant: string,
  contexts: string[],
}

export const DefaultModelOptions: IModelOptions = {model:'gpt35turbo', contexts:new Array<string>(), assistant: defaultSystemMessages[0].message};

interface IModelOptionsProps {
  options: IModelOptions,
  onChange: (options: IModelOptions )=>void,
}

export function ModelOptions(props: IModelOptionsProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const chatModels = useChatModels();
  const [model, setModel] = useState('gpt35turbo');
  const [savedSysMsgs, setSavedSysMsgs] = useState<ISystemMessage[]>([]);
  const [assistant, setAssistant] = useState<string>(defaultSystemMessages[0].message);
  const [contexts, setContext] = useState<string[]>([]);
  const [openPromptDlg, setPromptDlg] = useState(false);
  const [newSystemMessageName, setNewSystemMessageName] = useState('');
  const [newSystemMessage, setNewSystemMessage] = useState('');

  useEffect(()=>{
    const storedValue = localStorage.getItem('customSystemMessages');
    if (storedValue) {
      const msgs=JSON.parse(storedValue) as ISystemMessage[]
      setSavedSysMsgs(msgs.map(m=>({...m, type:'Custom'})));
    }
  }, []);

  useEffect(()=>{
    if (!chatModels) return;
    setModel(props.options.model);
    const aidx = [...defaultSystemMessages,...savedSysMsgs].findIndex(m=>m.message===props.options.assistant);
    if (aidx !== -1) {
      setAssistant(props.options.assistant);
    }
    setContext(props.options.contexts);
  }, [chatModels, props.options, savedSysMsgs])

  const handleContextChange = (event: SelectChangeEvent<string[]>) => {
    const {
      target: { value },
    } = event;
    const newcontexts = typeof value === 'string' ? value.split(',') : value;
    setContext(
      // On autofill we get a stringified value.
      newcontexts,
    );
    props.onChange({...props.options, contexts: newcontexts});
  }
  const handleModelChange = (e: SelectChangeEvent<string>) => {
    setModel(e.target.value as string);
    props.onChange({...props.options, model: e.target.value as string});
  }
  // const handleAssistantChange = (e: SyntheticEvent) => {
  //   setAssistant(e.target.value as string);
  //   props.onChange({...props.options, assistant: e.target.value as string});
  // }
  const handleAddCustomPrompt = () => {
    setPromptDlg(true);
  }
  const handlePromptDlgClose = () => setPromptDlg(false);

  const addNewSystemMessage = () => {
    setSavedSysMsgs(msgs => {
      const newlist = [...msgs, {name: newSystemMessageName, type:'Custom', message: newSystemMessage}];
      localStorage.setItem('customSystemMessages', JSON.stringify(newlist));
      return newlist
    });
    setPromptDlg(false);
  }
  const deleteSystemMessage = (m:ISystemMessage) => {
    setSavedSysMsgs(msgs => {
      const newlist = msgs.filter(msg=>msg.message!==m.message);
      localStorage.setItem('customSystemMessages', JSON.stringify(newlist));
      setAssistant(defaultSystemMessages[0].message);
      return newlist
    });
  }


  const availableModels = chatModels.data || [];
  const availableContexts = availableModels.find(m=>m.id===model)?.contexts||[];
  return <Grid container sx={{ml:-1, mt:0.5}}>
  <Grid item xs={12} sm={3} sx={{pr:1}}>
    <Tooltip arrow title='LLM model'>
      <FormControl sx={{ m: 1}} fullWidth>
        <InputLabel htmlFor="model-select">Model</InputLabel>
        <Select id="model-select" label="Model" size='small'
          value={model}
          onChange={handleModelChange}
        >
          <ListSubheader>Standard</ListSubheader>
          {(chatModels?.data||[]).filter(m=>m.group==='Standard').map(m=><MenuItem key={m.id} value={m.id} disabled={!m.enabled}>{m.name}</MenuItem>)}
          <ListSubheader>Custom</ListSubheader>
          {(chatModels?.data||[]).filter(m=>m.group==='Custom').map(m=><MenuItem key={m.id} value={m.id} disabled={!m.enabled}>{m.name}</MenuItem>)}
          <ListSubheader>Experimental</ListSubheader>
          {(chatModels?.data||[]).filter(m=>m.group==='Experimental').map(m=><MenuItem key={m.id} value={m.id} disabled={!m.enabled}>{m.name}</MenuItem>)}
          <ListSubheader>Open Source</ListSubheader>
          {(chatModels?.data||[]).filter(m=>m.group==='Open Source').map(m=><MenuItem key={m.id} value={m.id} disabled={!m.enabled}>{m.name}</MenuItem>)}

        </Select>
      </FormControl>
    </Tooltip>
  </Grid>
  <Grid item xs={12} sm={6} sx={{pr:1}}>
    <Stack direction="row" alignItems="center">
      <Tooltip arrow title='Initial prompt'>
        <FormControl sx={{ m: 1}} fullWidth>
          <SelectSystemMessage id="assistant-select" label="Act as"
            value={[...defaultSystemMessages, ...savedSysMsgs].find(m=>m.message===assistant)}
            options={[...defaultSystemMessages, ...savedSysMsgs]}
            onChange={v=>{if (v) { setAssistant(v.message); setNewSystemMessage(v.message); }}}
            onDelete={deleteSystemMessage}
          />
        </FormControl>
      </Tooltip>
      <Tooltip arrow title='Add a new initial system instruction'>
        <IconButton onClick={handleAddCustomPrompt}>
          <AddCircleOutlineIcon/>
        </IconButton>
      </Tooltip>
      <Dialog open={openPromptDlg} fullScreen={fullScreen}>
        <DialogTitle>Add a new "Initial system instruction"</DialogTitle>
        <DialogContent sx={{minWidth:{xs:'100%', sm:'600px'}}}>
          <Stack spacing={2} sx={{pt:1}}>
          <TextField fullWidth
            required
            id="system-message-name"
            label="Instruction Name"
            value={newSystemMessageName}
            onChange={(e)=>setNewSystemMessageName(e.target.value)}
          />

          <TextField fullWidth
            required multiline rows={6}
            id="system-message"
            label="Instruction"
            placeholder={defaultSystemMessages[0].message}
            variant="filled"
            value={newSystemMessage}
            onChange={(e)=>setNewSystemMessage(e.target.value)}
          />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={addNewSystemMessage}>Add</Button>
          <Button onClick={handlePromptDlgClose}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  </Grid>
  <Grid item xs={12} sm={3}>
    <Stack direction="row" spacing={0} alignItems="center">
      <Tooltip arrow placement="left" title='Context to the LLM from selected contexts, to give specific context for the of conversation'>
        <FormControl sx={{ m: 1}} fullWidth disabled={availableContexts.length===0}>
          <InputLabel htmlFor="contexts-select-label">Additional Context</InputLabel>
          <Select<string[]> id="contexts-select" labelId="contexts-select-label" label="Additional Contexts" size='small'
            multiple
            input={<OutlinedInput label="Tag" />}
            value={contexts}
            renderValue={(selected) => selected.join(', ')}
            onChange={handleContextChange}
            MenuProps={MenuProps}
          >
            {
              availableContexts.map(c=> <MenuItem key={c.id} value={c.id} disabled={!c.enabled}>
                <Checkbox checked={contexts.indexOf(c.id) > -1} />
                <Tooltip title={c.description}>
                  <ListItemText primary={c.name} />
                </Tooltip>
              </MenuItem>)
            }
          </Select>
        </FormControl>
      </Tooltip>
      {/* <Tooltip arrow title='Add a new context'>
        <IconButton>
          <AddCircleOutlineIcon/>
        </IconButton>
      </Tooltip> */}
    </Stack>
  </Grid>
</Grid>
}
