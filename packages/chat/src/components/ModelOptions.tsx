import { SelectChangeEvent, Grid, FormControl, InputLabel, Select, ListSubheader, MenuItem, Divider, OutlinedInput, Checkbox, ListItemText } from "@mui/material";
import { useState, useEffect } from "react";
import { useChatModels } from "../api/chat";
import { MenuProps } from "./MenuProps";
import Tooltip, { TooltipProps, tooltipClasses } from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

export const systemMessages = [
  {name:'AI Assistant', message: 'You are a helpful AI assistant. Respond in markdown format when possible'},
  {name:'divider', message: ''},
  {name:'Senior Software Engineer', message: 'You are a helpful AI assistant, acting as a senior software engineer.Respond in markdown format when possible'},
  {name:'Senior Product Manager', message: 'You are a helpful AI assistant, acting as a senior product manager.Respond in markdown format when possible'},
  {name:'Senior Experience designer', message: 'You are a helpful AI assistant, acting as a senior experience or UX designer.Respond in markdown format when possible'},
  {name:'Marketing Writing Assistant', message: `You are a marketing writing assistant. You help come up with creative content ideas and content like marketing emails, blog posts, tweets, ad copy and product descriptions. You write in a friendly yet professional tone but can tailor your writing style that best works for a user-specified audience. If you do not know the answer to a question, respond by saying "I do not know the answer to your question."`},
  {name:'divider', message: ''},
  {name:'AI Reviewer', message: 'You are a helpful AI assistant, acting as a senior software engineer. when reviewing the code you look for exception handling, security issues, performance problems, and readability of code. Respond in markdown format when possible'},
  {name:'AI Architect', message:'I want you to act as an IT Architect. I will provide some details about the functionality of an application or other digital product, and it will be your job to come up with ways to integrate it into the IT landscape. This could involve analyzing business requirements, performing a gap analysis and mapping the functionality of the new system to the existing IT landscape. Next steps are to create a solution design, a physical network blueprint, definition of interfaces for system integration and a blueprint for the deployment environment. '},
];


export interface IModelOptions {
  model:string,
  assistant: string,
  contexts: string[],
}

export const DefaultModelOptions: IModelOptions = {model:'gpt35turbo', contexts:new Array<string>(), assistant: systemMessages[0].message};

interface IModelOptionsProps {
  options: IModelOptions,
  onChange: (options: IModelOptions )=>void,
}

export function ModelOptions(props: IModelOptionsProps) {
  const chatModels = useChatModels();
  const [model, setModel] = useState('gpt35turbo');
  const [assistant, setAssistant] = useState(systemMessages[0].message);
  const [contexts, setContext] = useState<string[]>([]);

  useEffect(()=>{
    if (!chatModels) return;
    setModel(props.options.model);
    const aidx = systemMessages.findIndex(m=>m.message===props.options.assistant);
    if (aidx !== -1) {
      setAssistant(props.options.assistant);
    }
    setContext(props.options.contexts);
  }, [chatModels, props.options])

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
  const handleAssistantChange = (e: SelectChangeEvent<string>) => {
    setAssistant(e.target.value as string);
    props.onChange({...props.options, assistant: e.target.value as string});
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
    <Tooltip arrow title='Initial prompt'>
      <FormControl sx={{ m: 1}} fullWidth>
        <InputLabel htmlFor="assistant-select">Act as</InputLabel>
        <Select id="assistant-select" label="Act as" size='small'
          value={assistant}
          onChange={handleAssistantChange}
        >
          {systemMessages.map((m,i)=>(m.name==='divider')?<Divider key={i}/>:<MenuItem key={i} value={m.message}>{m.name}</MenuItem>)}
        </Select>
      </FormControl>
    </Tooltip>
  </Grid>
  <Grid item xs={12} sm={3}>
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
            availableContexts.map(c=> <MenuItem key={c.id} value={c.id}>
              <Checkbox checked={contexts.indexOf(c.id) > -1} />
              <ListItemText primary={c.name} />
            </MenuItem>)
          }
        </Select>
      </FormControl>
    </Tooltip>
  </Grid>
</Grid>
}
