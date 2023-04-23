import { useState, ChangeEvent, useEffect } from 'react';
import { Grid, TextField } from '@mui/material';
import Tooltip, { TooltipProps, tooltipClasses } from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';


export interface IModelParameters {
  temperature: number;
  max_tokens: number;
}
export interface IModelParametersProps {
  parameters: IModelParameters;
  onChange: (params: IModelParameters) => void;
}
export function ModelParameters(props: IModelParametersProps) {
  const [temperature, setTemperature] = useState(0);
  const [max_tokens, setMaxTokens] = useState(400);
  useEffect(() => {
    setTemperature(props.parameters.temperature);
    setMaxTokens(props.parameters.max_tokens);
  }, [props.parameters]);

  const handleTemperatureChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newTemperature = parseInt(e.target.value);
    setTemperature(newTemperature);
    props.onChange({ ...props.parameters, temperature: newTemperature });
  };

  const handleMaxTokensChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newMaxTokens = parseInt(e.target.value);
    setMaxTokens(newMaxTokens);
    props.onChange({ ...props.parameters, max_tokens: newMaxTokens });
  };

  return <Grid container sx={{ mt: 0.5 }}>
    <Grid item xs={12} sm={6} sx={{ p: 0.5 }}>
      <Tooltip arrow title={`Controls randomness. Lowering the temperature means that the model will produce more repetitive and deterministic responses. Increasing the temperature will result in more unexpected or creative responses. Try adjusting temperature or Top P but not both.`}>
        <TextField id="model-temperature" label="Temperature" size='small'
          type='number' fullWidth
          value={temperature}
          onChange={handleTemperatureChange} />
      </Tooltip>
    </Grid>
    <Grid item xs={12} sm={6} sx={{ p: 0.5 }}>
      <Tooltip arrow title={`Set a limit on the number of tokens per model response. The API supports a maximum of 4000 tokens shared between the prompt (including system message, examples, message history, and user query) and the model's response. One token is roughly 4 characters for typical English text.`}>
        <TextField id="max_tokens" label="Max Tokens" size='small'
          type='number' fullWidth
          value={max_tokens}
          onChange={handleMaxTokensChange} />
      </Tooltip>
    </Grid>
  </Grid>;
}
