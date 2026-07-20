import {
  makeStyles,
  mergeClasses,
  tokens,
  Input,
  Button,
  Text,
  Caption1,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
} from '@fluentui/react-components';
import {
  SearchRegular,
  SparkleRegular,
  SendRegular,
  DismissRegular,
  MicRegular,
  HistoryRegular,
  CheckboxCheckedRegular,
} from '@fluentui/react-icons';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { color, elevation } from '../tokens';

export interface SearchResult {
  id: string;
  title: string;
  category: string;
  subtitle?: string;
  to?: string;
}

export interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (value: string) => void;
  results: SearchResult[];
  onSelect: (result: SearchResult) => void;
  emptyLabel?: string;
}

const useSearch = makeStyles({
  surface: {
    maxWidth: '680px',
    width: 'calc(100vw - 24px)',
    borderRadius: '16px',
    boxShadow: elevation.lg,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginTop: '12px',
    maxHeight: '360px',
    overflow: 'auto',
  },
  item: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '10px 12px',
    borderRadius: tokens.borderRadiusMedium,
    border: 'none',
    background: 'transparent',
    textAlign: 'left',
    cursor: 'pointer',
    color: tokens.colorNeutralForeground1,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground3,
    },
    ':focus-visible': {
      outline: `2px solid ${tokens.colorStrokeFocus2}`,
    },
  },
});

export function GlobalSearch({
  open,
  onOpenChange,
  query,
  onQueryChange,
  results,
  onSelect,
  emptyLabel = 'No matches. Try clients, projects, documents, or approvals.',
}: GlobalSearchProps) {
  const s = useSearch();
  return (
    <Dialog open={open} onOpenChange={(_, d) => onOpenChange(d.open)}>
      <DialogSurface className={s.surface}>
        <DialogBody>
          <DialogTitle>Command palette</DialogTitle>
          <DialogContent>
            <Input
              appearance="outline"
              contentBefore={<SearchRegular />}
              placeholder="Search everything…"
              value={query}
              onChange={(_, d) => onQueryChange(d.value)}
              aria-label="Search query"
              autoFocus
            />
            <div className={s.list} role="listbox" aria-label="Search results">
              {!results.length ? (
                <Caption1>{emptyLabel}</Caption1>
              ) : (
                results.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={s.item}
                    role="option"
                    onClick={() => {
                      onSelect(r);
                      onOpenChange(false);
                    }}
                  >
                    <Text weight="semibold">{r.title}</Text>
                    <Caption1>
                      {r.category}
                      {r.subtitle ? ` · ${r.subtitle}` : ''}
                    </Caption1>
                  </button>
                ))
              )}
            </div>
          </DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

const useAi = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px',
    borderRadius: tokens.borderRadiusXLarge,
    background: `linear-gradient(145deg, ${color.navyDeep} 0%, ${color.navySoft} 55%, #163556 100%)`,
    color: '#F8FAFC',
    boxShadow: elevation.ai,
    border: '1px solid rgba(37, 99, 235, 0.35)',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  examples: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  chip: {
    border: '1px solid rgba(248, 250, 252, 0.28)',
    backgroundColor: 'rgba(248, 250, 252, 0.08)',
    color: '#F8FAFC',
    borderRadius: '999px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: tokens.fontSizeBase200,
    ':hover': {
      backgroundColor: 'rgba(37, 99, 235, 0.28)',
      border: '1px solid rgba(201, 162, 39, 0.65)',
    },
    ':focus-visible': {
      outline: '2px solid #E0B93A',
      outlineOffset: '2px',
    },
  },
  row: {
    display: 'flex',
    gap: '8px',
    alignItems: 'stretch',
    flexWrap: 'wrap',
  },
  inputGrow: {
    flex: 1,
    minWidth: '200px',
  },
  response: {
    padding: '10px 12px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  history: {
    display: 'grid',
    gap: '6px',
    maxHeight: '160px',
    overflow: 'auto',
  },
  historyItem: {
    padding: '8px 10px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  quick: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
});

export const DEFAULT_AI_EXAMPLES = [
  'Summarize today’s executive priorities.',
  'What is blocking capital readiness?',
  'Find missing lender documents.',
  'Draft investor memo outline.',
  'Recommend next client actions.',
  'Explain cash position status.',
];

export interface GlobalAICommandPanelProps {
  examples?: string[];
  onSubmit?: (prompt: string) => void;
  placeholder?: string;
  title?: string;
  subtitle?: string;
  className?: string;
  stubResponder?: (prompt: string) => string;
  history?: string[];
  quickActions?: Array<{ id: string; label: string; onClick?: () => void }>;
}

export function GlobalAICommandPanel({
  examples = DEFAULT_AI_EXAMPLES,
  onSubmit,
  placeholder = 'Ask Atlas Copilot…',
  title = 'Executive Copilot',
  subtitle = 'Context-aware guidance — Development stubs only; no live client actions.',
  className,
  stubResponder = (p) =>
    `Dev stub: received “${p}”. Live Copilot / client communications are disabled in Development.`,
  history = [],
  quickActions = [
    { id: 'approve', label: 'Review approvals' },
    { id: 'capital', label: 'Capital readiness' },
    { id: 'docs', label: 'Missing documents' },
  ],
}: GlobalAICommandPanelProps) {
  const s = useAi();
  const [value, setValue] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [localHistory, setLocalHistory] = useState<string[]>(history);

  const run = (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    onSubmit?.(trimmed);
    setLocalHistory((h) => [trimmed, ...h].slice(0, 8));
    setResponse(stubResponder(trimmed));
  };

  return (
    <section className={mergeClasses(s.root, 'atlas-fade-in', className)} aria-label={title}>
      <div className={s.titleRow}>
        <SparkleRegular fontSize={22} aria-hidden />
        <div style={{ flex: 1 }}>
          <Text weight="semibold" size={500} style={{ color: '#F8FAFC' }}>
            {title}
          </Text>
          <Caption1 style={{ color: 'rgba(248,250,252,0.82)' }}>{subtitle}</Caption1>
        </div>
        <Button
          appearance="subtle"
          icon={<MicRegular />}
          aria-label="Voice-ready interface"
          title="Voice-ready"
          style={{ color: '#F8FAFC' }}
        />
      </div>
      <div className={s.examples} aria-label="Suggested prompts">
        {examples.map((ex) => (
          <button
            key={ex}
            type="button"
            className={s.chip}
            onClick={() => {
              setValue(ex);
              run(ex);
            }}
          >
            {ex}
          </button>
        ))}
      </div>
      <div className={s.quick} aria-label="Quick actions">
        {quickActions.map((a) => (
          <Button
            key={a.id}
            size="small"
            appearance="secondary"
            icon={<CheckboxCheckedRegular />}
            onClick={() => {
              a.onClick?.();
              run(a.label);
            }}
          >
            {a.label}
          </Button>
        ))}
      </div>
      <div className={s.row}>
        <div className={s.inputGrow}>
          <Input
            appearance="filled-darker"
            value={value}
            placeholder={placeholder}
            onChange={(_, d) => setValue(d.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') run(value);
            }}
            aria-label="AI command prompt"
          />
        </div>
        <Button appearance="primary" icon={<SendRegular />} onClick={() => run(value)} aria-label="Submit AI command">
          Ask
        </Button>
      </div>
      {response ? (
        <div className={s.response} role="status">
          <Text size={300} style={{ color: '#F8FAFC' }}>
            {response}
          </Text>
        </div>
      ) : null}
      {localHistory.length ? (
        <div>
          <div className={s.titleRow} style={{ marginBottom: 6 }}>
            <HistoryRegular />
            <Caption1 style={{ color: 'rgba(248,250,252,0.82)' }}>Conversation history</Caption1>
          </div>
          <div className={s.history}>
            {localHistory.map((h) => (
              <button
                key={h}
                type="button"
                className={s.historyItem}
                onClick={() => {
                  setValue(h);
                  run(h);
                }}
                style={{ color: '#F8FAFC', textAlign: 'left', cursor: 'pointer', width: '100%' }}
              >
                <Caption1 style={{ color: 'rgba(248,250,252,0.9)' }}>{h}</Caption1>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export interface AICommandDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (prompt: string) => void;
}

export function AICommandDrawer({ open, onOpenChange, onSubmit }: AICommandDrawerProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  return (
    <Drawer
      open={open}
      onOpenChange={(_, d) => onOpenChange(d.open)}
      position="end"
      size="medium"
      style={{ width: 'min(420px, 100vw)' }}
    >
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              aria-label="Close Copilot"
              icon={<DismissRegular />}
              onClick={() => onOpenChange(false)}
            />
          }
        >
          Executive Copilot
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody>
        <GlobalAICommandPanel onSubmit={onSubmit} />
      </DrawerBody>
    </Drawer>
  );
}

export function BrandMark({
  src = '/brand/hvcg-logo.png',
  height = 40,
}: {
  src?: string;
  height?: number;
}): ReactNode {
  return <img src={src} alt="High Value Capital Group" style={{ height, width: 'auto' }} />;
}
