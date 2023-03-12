const createFlagImg = (flag: string) => {
  return <img width="15" height="10" alt={`flag for ${flag}`} src={`https://flagcdn.com/h20/${flag}.png`} />;
};
export const RegionRenderer = (props: any) => {
  const flags: any = {
    'IND': createFlagImg('in'),
    'NA': createFlagImg('us'),
    'EU': createFlagImg('eu'),
    'ME': createFlagImg('ae'), //uae
    // 'AP': '🌏',
  };
  return (
    <span>
      {flags[props.value] || '🌏 '}
      {props.value}
    </span>
  );
};
