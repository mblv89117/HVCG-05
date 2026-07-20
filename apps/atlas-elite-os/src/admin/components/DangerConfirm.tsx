import { useState } from 'react';
import { AtlasDialog } from '@hvcg/atlas-design-system';
import { Text, MessageBar, MessageBarBody, MessageBarTitle, Button } from '@fluentui/react-components';

export function DangerConfirmDialog({
  open,
  title,
  impact,
  confirmLabel = 'Confirm change',
  onConfirm,
  onOpenChange,
  children,
}: {
  open: boolean;
  title: string;
  impact: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <AtlasDialog
      open={open}
      title={title}
      onOpenChange={onOpenChange}
      secondaryAction={{ label: 'Cancel', onClick: () => onOpenChange(false) }}
      primaryAction={{
        label: confirmLabel,
        appearance: 'primary',
        onClick: () => {
          onConfirm();
          onOpenChange(false);
        },
      }}
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>High-impact action</MessageBarTitle>
            {impact}
          </MessageBarBody>
        </MessageBar>
        {children}
        <Text size={200}>This change is written to the administration audit log.</Text>
      </div>
    </AtlasDialog>
  );
}

/** Visually distinct destructive primary control */
export function DangerButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      appearance="primary"
      disabled={disabled}
      onClick={onClick}
      style={{
        backgroundColor: '#b10e1c',
        borderColor: '#b10e1c',
        color: '#fff',
      }}
    >
      {children}
    </Button>
  );
}

export function useDangerConfirm() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<{
    title: string;
    impact: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  function request(next: {
    title: string;
    impact: string;
    confirmLabel?: string;
    onConfirm: () => void;
  }) {
    setPayload(next);
    setOpen(true);
  }

  const dialog = payload ? (
    <DangerConfirmDialog
      open={open}
      title={payload.title}
      impact={payload.impact}
      confirmLabel={payload.confirmLabel}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setPayload(null);
      }}
      onConfirm={payload.onConfirm}
    />
  ) : null;

  return { request, dialog };
}
