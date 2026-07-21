import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  makeStyles,
  tokens,
  Text,
  mergeClasses,
} from '@fluentui/react-components';
import { DismissRegular } from '@fluentui/react-icons';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

export interface AtlasDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
  primaryAction?: { label: string; onClick: () => void; appearance?: 'primary' | 'secondary' };
  secondaryAction?: { label: string; onClick: () => void };
}

export function AtlasDialog({
  open,
  title,
  children,
  onOpenChange,
  primaryAction,
  secondaryAction,
}: AtlasDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(_, d) => onOpenChange(d.open)}>
      <DialogSurface aria-describedby={undefined}>
        <DialogBody>
          <DialogTitle
            action={
              <Button
                appearance="subtle"
                aria-label="Close"
                icon={<DismissRegular />}
                onClick={() => onOpenChange(false)}
              />
            }
          >
            {title}
          </DialogTitle>
          <DialogContent>{children}</DialogContent>
          <DialogActions>
            {secondaryAction ? (
              <Button appearance="secondary" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            ) : null}
            {primaryAction ? (
              <Button
                appearance={primaryAction.appearance || 'primary'}
                onClick={primaryAction.onClick}
              >
                {primaryAction.label}
              </Button>
            ) : null}
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export interface ToastItem {
  id: string;
  title: string;
  body?: string;
  tone?: ToastTone;
}

const useToast = makeStyles({
  stack: {
    position: 'fixed',
    right: '16px',
    bottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    zIndex: 100,
    maxWidth: '360px',
    width: 'calc(100vw - 32px)',
  },
  item: {
    padding: '12px 14px',
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    boxShadow: '0 12px 32px rgba(11, 31, 51, 0.14)',
  },
  success: { border: '1px solid rgba(5, 150, 105, 0.45)' },
  warning: { border: '1px solid rgba(217, 119, 6, 0.55)' },
  danger: { border: '1px solid rgba(220, 38, 38, 0.45)' },
  info: { border: '1px solid rgba(37, 99, 235, 0.45)' },
});

export function NotificationStack({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  const s = useToast();
  return (
    <div className={s.stack} aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          className={mergeClasses(s.item, s[t.tone || 'info'], 'atlas-fade-in')}
          role="status"
        >
          <Text weight="semibold">{t.title}</Text>
          {t.body ? <Text size={200}>{t.body}</Text> : null}
          <div>
            <Button size="small" appearance="transparent" onClick={() => onDismiss(t.id)}>
              Dismiss
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Simple hook for ephemeral toasts. */
export function useNotifications() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = (toast: Omit<ToastItem, 'id'> & { id?: string }) => {
    const id = toast.id || `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setItems((prev) => [...prev, { ...toast, id }]);
    return id;
  };
  const dismiss = (id: string) => setItems((prev) => prev.filter((t) => t.id !== id));
  useEffect(() => {
    if (!items.length) return;
    const timers = items.map((t) =>
      window.setTimeout(() => dismiss(t.id), 5000),
    );
    return () => timers.forEach(clearTimeout);
  }, [items]);
  return { items, push, dismiss };
}
