import { useState, type ReactNode, type FormEvent } from 'react';
import { AtlasForm, FormField, FormRow, FormActions } from '@hvcg/atlas-design-system';
import { Button, Text } from '@fluentui/react-components';
import { useAdminFeedback } from './AdminFeedback';

export function SettingsForm({
  onSave,
  children,
  saveLabel = 'Save changes',
  disabled,
}: {
  onSave: () => void;
  children: ReactNode;
  saveLabel?: string;
  disabled?: boolean;
}) {
  const feedback = useAdminFeedback();
  const [busy, setBusy] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      onSave();
      feedback.success('Saved', 'Your changes are recorded in the audit log.');
    } catch (err) {
      feedback.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AtlasForm onSubmit={handleSubmit}>
      {children}
      <FormActions>
        <Button appearance="primary" type="submit" disabled={disabled || busy}>
          {saveLabel}
        </Button>
      </FormActions>
    </AtlasForm>
  );
}

export { FormField, FormRow, FormActions, useAdminFeedback };

export function Hint({ children }: { children: ReactNode }) {
  return (
    <Text size={200} style={{ color: 'var(--colorNeutralForeground2)' }}>
      {children}
    </Text>
  );
}
