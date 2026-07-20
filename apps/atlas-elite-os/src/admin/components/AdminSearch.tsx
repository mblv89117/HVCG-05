import { Input, Text } from '@fluentui/react-components';
import { SearchRegular } from '@fluentui/react-icons';

export function AdminSearch({
  value,
  onChange,
  placeholder = 'Search administration…',
  label = 'Search',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}) {
  return (
    <div style={{ display: 'grid', gap: 6, maxWidth: 420 }}>
      <Text size={200} weight="semibold">
        {label}
      </Text>
      <Input
        contentBefore={<SearchRegular />}
        value={value}
        onChange={(_, d) => onChange(d.value)}
        placeholder={placeholder}
        aria-label={label}
      />
    </div>
  );
}
