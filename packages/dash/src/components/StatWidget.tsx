import React, { ReactNode, useCallback } from 'react';
import { Box, BoxProps, Card, CardContent, CardHeader, CircularProgress, CircularProgressProps, IconButton, Paper, SxProps, Tooltip, Typography } from "@mui/material";
import { Row } from "./RowColumn";
import { styled } from '@mui/material/styles';
import Badge from '@mui/material/Badge';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import { ResponsiveContainer, PieChart, Pie, Legend, Sector, Cell } from 'recharts';
import Popover from '@mui/material/Popover';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';

const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: '#44b700',
    color: '#44b700',
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    '&::after': {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      animation: 'ripple 1.2s infinite ease-in-out',
      border: '1px solid currentColor',
      content: '""',
    },
  },
  '@keyframes ripple': {
    '0%': {
      transform: 'scale(.8)',
      opacity: 1,
    },
    '100%': {
      transform: 'scale(2.4)',
      opacity: 0,
    },
  },
}));

interface CommonStatWidgetProps {
  sx?: SxProps,
  elevation?: number,
  title?: string,
  size?: 'large'|'medium'|'small';
  onClick?: () => void;
  onClose?: ()=> void;
}
interface StatContainerProps extends CommonStatWidgetProps {
  children: React.ReactNode,
}

export function StatContainer(props: StatContainerProps) {
  const [isMouseOver, setMouseOver] = React.useState(false);

  const size = props.size||'medium';
  const sx: SxProps = {minWidth:size!=='small'?128:undefined, minHeight: size!=='small'?168:undefined, background:'#fff', ...props.sx, position: 'relative'};
  const elevation = props.elevation===undefined ? (size === 'small' ? 0 : 1) : props.elevation;

  return <Paper elevation={isMouseOver?elevation+4:elevation} sx={sx}
    onMouseOver={()=>setMouseOver(true)}
    onMouseOut={()=>setMouseOver(false)}>
      {(isMouseOver && props.onClose) ? <IconButton aria-label="close" sx={{position:'absolute', top:0, right:0}} onClick={props.onClose} size='small'>
        <HighlightOffIcon/>
      </IconButton> : null}
    {props.children}
  </Paper>
}

interface StatWidgetProps extends CommonStatWidgetProps {
  children?: React.ReactNode,
  rightTopNode?: React.ReactNode,
  leftTopNode?: React.ReactNode,
  rightBottomNode?: React.ReactNode,
  leftBottomNode?: React.ReactNode,
  baseline?: React.ReactNode,
  details?: React.ReactNode,
}

export const StatWidget: React.FC<StatWidgetProps> = (props) => {
  const [isMouseOver, setMouseOver] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);
  const size = props.size||'medium';
  const open = Boolean(anchorEl);
  const handleOpenPopover = (event: any) => {
    if (props.details) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClick = (event: any) => {
    if (props.onClick) {
      props.onClick();
    }
  }

  const handleClose = (event: unknown, reason: "backdropClick" | "escapeKeyDown") => {
    setAnchorEl(null);
  };

  return <StatContainer sx={props.sx} elevation={props.elevation} size={size} onClose={props.onClose}>
    <Box
      sx={{display:'flex', flexDirection:'column', justifyContent:'space-between', height:'100%'}}
      onClick={handleOpenPopover}
    >
      {size!=='small'?<Row justifyContent="space-between" sx={{p:1}}>
        <Tooltip title='Industry'>
          <div>
            <Box sx={{ height:22, minWidth:'22', px:0.5, borderRadius:500, display:'flex', justifyContent:'center', alignItems:'center'}}>
              {props.leftTopNode}
            </Box>
          </div>
        </Tooltip>
          {/* <StyledBadge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            variant="dot"
          >
            <Avatar sx={{width:22, height:22}}>
              {props.leftNode}
            </Avatar>
          </StyledBadge> */}
        <div>
          <Tooltip title='Account'>
            <Box sx={{ height:22, minWidth:'22', px:0.5, borderRadius:500, display:'flex', justifyContent:'center', alignItems:'center', cursor:'pointer'}}>
              {props.rightTopNode}
            </Box>
          </Tooltip>
        </div>
      </Row>:null}
      <Row justifyContent="center" alignItems='center' sx={{p:1, minHeight:size==='small'?72:84}}>
        <Stack alignItems='center' justifyContent='center' direction={'column'}>
          <div style={{display:'flex',minHeight:56, minWidth: 56, alignItems:'center', justifyContent:'center'}}>{props.children}</div>
          <Typography variant="caption"><span>{props.title}</span></Typography>
        </Stack>
      </Row>
      {size!=='small'?<Row justifyContent="space-between" sx={{p:1}}>
        <Tooltip title='Company'>
          <div>
            <Box sx={{ height:22, minWidth:'22', px:0.5, borderRadius:500, display:'flex', justifyContent:'center', alignItems:'center'}}>
              {props.leftBottomNode}
            </Box>
          </div>
        </Tooltip>
        {props.baseline??<Typography variant='caption'>&nbsp;</Typography>}
        <Tooltip title='Capability'>
          <div>
            <Box sx={{ height:22, minWidth:'22', px:0.5, borderRadius:500, display:'flex', justifyContent:'center', alignItems:'center', cursor:'pointer'}}>
              {props.rightBottomNode}
            </Box>
          </div>
        </Tooltip>
      </Row>:null}
    </Box>
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={handleClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
    >
      {props.details}
    </Popover>
  </StatContainer>
}


interface NumberStatWidgetProps extends CommonStatWidgetProps {
  value: number|string,
  valueTopRight?: number|string,
  valueTopLeft?: number|string,
  valueBottomRight?: number|string,
  valueBottomLeft?: number|string,
}

export const NumberStatWidget: React.FC<NumberStatWidgetProps> = (props) => {
  const {value, valueTopLeft, valueTopRight, valueBottomLeft, valueBottomRight, ...statProps} = props;
  return <StatWidget {...statProps}
    leftTopNode={<Typography variant="body2"><span>{valueTopLeft}</span></Typography>}
    rightTopNode={<Typography variant="body2"><span>{valueTopRight}</span></Typography>}
    leftBottomNode={<Typography variant="body2"><span>{valueBottomLeft}</span></Typography>}
    rightBottomNode={<Typography variant="body2"><span>{valueBottomRight}</span></Typography>}
  >
    <Typography variant="h4"><span>{value}</span></Typography>
  </StatWidget>
}



function CircularProgressWithLabel(
  props: CircularProgressProps & { value: number },
) {
  const {value, ...otherProps} = props;
  const [progress, setProgress] = React.useState<number>(0);
  React.useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prevProgress) => {
        if (prevProgress < value) {
          return prevProgress + value/10 ;
        }
        clearInterval(timer);
        return value;
      });
    }, 100);
    return () => {
      clearInterval(timer);
    };
  }, [value]);
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress variant="determinate" value={progress} {...otherProps} />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          variant="caption"
          component="div"
          color="text.secondary"
        >{`${Math.round(props.value)}%`}</Typography>
      </Box>
    </Box>
  );
}

interface PercentStatWidgetProps extends CommonStatWidgetProps {
  value: number,
  valueTopRight?: number|string,
  valueTopLeft?: number|string,
  valueBottomRight?: number|string,
  valueBottomLeft?: number|string,
}

export const PercentStatWidget: React.FC<PercentStatWidgetProps> = (props) => {
  const {value, valueTopLeft, valueTopRight, valueBottomLeft, valueBottomRight, ...statProps} = props;
  const nodeStyle={
    borderRadius:'100px', px:0.75, backgroundColor:'#fff', borderColor:'#e1e1e1', borderWidth: 1, borderStyle: 'solid',
    boxShadow: "inset 1px 1px 4px 0px lightgray",
  };
  return <StatWidget {...statProps}
    leftTopNode={<Box sx={nodeStyle}><Typography variant="body2" sx={{fontSize:'0.75em'}}><span>{valueTopLeft}%</span></Typography></Box>}
    rightTopNode={<Box sx={nodeStyle}><Typography variant="body2" sx={{fontSize:'0.75em'}}><span>{valueTopRight}%</span></Typography></Box>}
    leftBottomNode={<Box sx={nodeStyle}><Typography variant="body2" sx={{fontSize:'0.75em'}}><span>{valueBottomLeft}%</span></Typography></Box>}
    rightBottomNode={<Box sx={nodeStyle}><Typography variant="body2" sx={{fontSize:'0.75em'}}><span>{valueBottomRight}%</span></Typography></Box>}
  >
    <CircularProgressWithLabel value={value} />
  </StatWidget>
}


const COLORS = ['#079FFF', '#FFE63B', '#00E6C3', '#FE414D', '#FF8042', '#FFBB28', '#00C49F'];

const RADIAN = Math.PI / 180;


function renderActiveShape(props:any) {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 20) * cos;
  const my = cy + (outerRadius + 20) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 12;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      {/* <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
        {payload.name}
      </text> */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`${payload.name}`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
        {`(${payload.value})`}
      </text>
    </g>
  );
};

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }:any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

interface PieStatWidgetProps extends CommonStatWidgetProps {
  value: Array<{name:string, value:number}>,
  valueTopRight?: Array<{name:string, value:number}>,
  valueTopLeft?: Array<{name:string, value:number}>,
}

export const PieStatWidget: React.FC<PieStatWidgetProps> = (props) => {
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const {value, valueTopLeft, valueTopRight, ...statProps} = props;
  const onPieEnter = useCallback((_:any, index:number) => {
    setSelectedIndex(index);
  }, [setSelectedIndex]);

  return <StatWidget {...statProps}
    leftTopNode={<Typography variant="body2"><span>{valueTopLeft&&selectedIndex!==-1?valueTopLeft[selectedIndex]?.value:''}</span></Typography>}
    rightTopNode={<Typography variant="body2"><span>{valueTopRight&&selectedIndex!==-1?valueTopRight[selectedIndex]?.value:''}</span></Typography>}
    details={<Card sx={{minHeight:400, minWidth: 400}}>
      <CardHeader
        title ={<Typography variant="h6"><span>{props.title}</span></Typography>}
      />
      <CardContent>
        <PieChart width={600} height={300}>
          <Pie
            dataKey="value" data={value}
            fill="#8884d8"
            cx="50%"
            cy="50%"
            outerRadius={100}
            onMouseEnter={onPieEnter}
            labelLine={false}
            label={renderCustomizedLabel}

            activeIndex={selectedIndex}
            activeShape={renderActiveShape}
          >
            {props.value.map((entry:any, index:number) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Legend layout='vertical' verticalAlign="middle" align='right'/>
        </PieChart>
      </CardContent>
    </Card>}
    >
      <PieChart width={56} height={56}>
          <Pie
            dataKey="value" data={value}
            fill="#8884d8"
            cx="50%"
            cy="50%"
            outerRadius={25}
            onMouseEnter={onPieEnter}
          >
            {props.value.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
      </PieChart>
  </StatWidget>
}
