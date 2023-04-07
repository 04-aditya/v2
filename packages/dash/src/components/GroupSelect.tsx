import React, { useEffect } from 'react';
import { useUserGroups } from 'psnapi/users';
import AutocompleteCheckbox from '@/components/AutocompleteCheckbox';


export interface GroupSelectProps {
  userId?: string;
  value: { type: string; name: string; role: string; }[];
  onChange: (newvalue: Array<{ type: string; name: string; role: string; }>) => void;
}

export function GroupSelect(props: GroupSelectProps) {
  const { data: groups = [], isLoading } = useUserGroups(props.userId);
  const [selectedUserGroups, setSelectedUserGroups] = React.useState<Array<{ type: string; name: string; role: string; }>>([]);

  useEffect(() => {
    if (props.value.length === 0 && groups && groups.length > 0) {
      setSelectedUserGroups(_ => {
        const group = groups.find(g => g.name === 'Team') || groups[0];
        props.onChange([group]);
        return [group];
      });
    } else {
      setSelectedUserGroups(props.value);
    }
  }, [groups, props, props.value]);

  const handleSelectedUserGroupsChange = (
    _event: React.SyntheticEvent,
    newvalue: Array<{ type: string; name: string; role: string; }>
  ) => {
    setSelectedUserGroups(newvalue);
    props.onChange(newvalue);
  };

  return <AutocompleteCheckbox loading={isLoading}
    options={groups || []}
    isOptionEqualToValue={(option: any, value: any) => option.name === value.name && option.type === value.type}
    getOptionLabel={g => g.name + '(' + g.type + ')'}
    value={selectedUserGroups}
    onChange={handleSelectedUserGroupsChange} style={{ width: 300 }} />;
}
