import { useState } from 'react';
import { Button, Input, Caption1, MessageBar, MessageBarBody } from '@fluentui/react-components';
import { FlashRegular } from '@fluentui/react-icons';
import { AtlasCard } from '@hvcg/atlas-design-system';
import type { AtlasHubAuthHeaders } from '../integrations/hub/api';
import { quickCapturePm } from '../integrations/hub/pmApi';

export function QuickCaptureBar({
  auth,
  onCreated,
  supported = false,
}: {
  auth: AtlasHubAuthHeaders;
  onCreated?: () => void;
  /** Production SharePoint MVP does not implement /api/pm/quick-capture. */
  supported?: boolean;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    if (!supported || !text.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await quickCapturePm(auth, text.trim());
      setMessage(res.message);
      setText('');
      onCreated?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Capture failed');
    } finally {
      setBusy(false);
    }
  };

  if (!supported) {
    return (
      <AtlasCard>
        <Caption1 style={{ display: 'block' }}>
          Quick Capture is not implemented for SharePoint production. Create or complete a task from
          a project instead.
        </Caption1>
      </AtlasCard>
    );
  }

  return (
    <AtlasCard>
      <Caption1 style={{ display: 'block', marginBottom: 6 }}>
        Quick Capture — type or paste. Atlas creates the task, waiting item, or delegation.
      </Caption1>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Input
          style={{ flex: 1, minWidth: 240 }}
          placeholder="e.g. Follow up with Ryan about the property tomorrow"
          value={text}
          onChange={(_, d) => setText(d.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
          }}
        />
        <Button appearance="primary" icon={<FlashRegular />} disabled={busy} onClick={() => void submit()}>
          Capture
        </Button>
      </div>
      {message ? (
        <MessageBar intent="info" style={{ marginTop: 8 }}>
          <MessageBarBody>{message}</MessageBarBody>
        </MessageBar>
      ) : null}
    </AtlasCard>
  );
}
