import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { NotificationStack, useNotifications } from '@hvcg/atlas-design-system';
import { ValidationError } from '../model';

type FeedbackApi = {
  success: (title: string, body?: string) => void;
  error: (err: unknown) => void;
  info: (title: string, body?: string) => void;
};

const Ctx = createContext<FeedbackApi | null>(null);

export function AdminFeedbackProvider({ children }: { children: ReactNode }) {
  const { items, push, dismiss } = useNotifications();
  const api = useMemo<FeedbackApi>(
    () => ({
      success(title, body) {
        push({ title, body, tone: 'success' });
      },
      info(title, body) {
        push({ title, body, tone: 'info' });
      },
      error(err) {
        const message =
          err instanceof ValidationError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Something went wrong.';
        push({ title: 'Could not save', body: message, tone: 'danger' });
      },
    }),
    [push],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <NotificationStack items={items} onDismiss={dismiss} />
    </Ctx.Provider>
  );
}

export function useAdminFeedback(): FeedbackApi {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('useAdminFeedback must be used within AdminFeedbackProvider');
  }
  return ctx;
}
