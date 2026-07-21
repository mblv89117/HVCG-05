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
} from '@fluentui/react-icons';
import type { ReactNode } from 'react';
import { useState } from 'react';

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
    maxWidth: '640px',
    width: 'calc(100vw - 24px)',
  },
  kbd: {
    marginLeft: 'auto',
    padding: '2px 6px',
    borderRadius: '4px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground2,
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
          <DialogTitle
            action={<Caption1 className={s.kbd}>⌘K</Caption1>}
          >
            Command palette
          </DialogTitle>
          <DialogContent>
            <Input
              appearance="outline"
              contentBefore={<SearchRegular />}
              placeholder="Search Atlas or jump to a module…"
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
    gap: '14px',
    padding: '20px',
    borderRadius: tokens.borderRadiusXLarge,
    background: 'linear-gradient(145deg, #071624 0%, #0B1F33 55%, #122A42 100%)',
    color: '#F1F5F9',
    boxShadow: '0 12px 36px rgba(11, 31, 51, 0.22)',
    border: '1px solid rgba(201, 162, 39, 0.28)',
    height: '100%',
    minHeight: '280px',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
  },
  sparkle: {
    color: '#E0B93A',
    marginTop: '2px',
  },
  examples: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  chip: {
    border: '1px solid rgba(241, 245, 249, 0.22)',
    backgroundColor: 'rgba(241, 245, 249, 0.06)',
    color: '#F1F5F9',
    borderRadius: '999px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: tokens.fontSizeBase200,
    transitionProperty: 'background-color, border-color',
    transitionDuration: '120ms',
    ':hover': {
      backgroundColor: 'rgba(201, 162, 39, 0.22)',
      border: '1px solid rgba(201, 162, 39, 0.55)',
    },
    ':focus-visible': {
      outline: '2px solid #3B82F6',
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
    minWidth: '160px',
  },
  response: {
    padding: '12px 14px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: 'rgba(0,0,0,0.28)',
    border: '1px solid rgba(37, 99, 235, 0.25)',
  },
  history: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '160px',
    overflow: 'auto',
  },
  historyItem: {
    padding: '8px 10px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: 'rgba(255,255,255,0.04)',
    border: 'none',
    color: '#CBD5E1',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: tokens.fontSizeBase200,
    ':hover': {
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
  },
  voiceReady: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: 'rgba(241,245,249,0.65)',
  },
});

export const DEFAULT_AI_EXAMPLES = [
  'Build SBA package.',
  'Find missing documents.',
  'Summarize client.',
  'Create valuation.',
  'Prepare lender package.',
  'Generate investor memo.',
  'Schedule follow-up.',
  'Create tasks.',
  'Update CRM.',
];

export interface GlobalAICommandPanelProps {
  examples?: string[];
  onSubmit?: (prompt: string) => void;
  placeholder?: string;
  title?: string;
  subtitle?: string;
  className?: string;
  /** Dev-only stub response renderer */
  stubResponder?: (prompt: string) => string;
  history?: string[];
  onNavigateHint?: (path: string) => void;
}

export function GlobalAICommandPanel({
  examples = DEFAULT_AI_EXAMPLES,
  onSubmit,
  placeholder = 'Ask Atlas Copilot…',
  title = 'AI Command Center',
  subtitle = 'Context-aware assistant — development stubs only; no live client actions.',
  className,
  stubResponder = (p) =>
    `Dev stub: received “${p}”. Live Copilot / client communications are disabled in Development.`,
  history = [],
  onNavigateHint,
}: GlobalAICommandPanelProps) {
  const s = useAi();
  const [value, setValue] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [localHistory, setLocalHistory] = useState<string[]>(history);

  const run = (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    onSubmit?.(trimmed);
    setLocalHistory((prev) => [trimmed, ...prev.filter((h) => h !== trimmed)].slice(0, 8));
    setResponse(stubResponder(trimmed));
    const lower = trimmed.toLowerCase();
    if (lower.includes('bank') && onNavigateHint) onNavigateHint('/banking');
    else if (lower.includes('document') && onNavigateHint) onNavigateHint('/documents');
    else if (lower.includes('client') && onNavigateHint) onNavigateHint('/clients');
    else if (lower.includes('financial') && onNavigateHint) onNavigateHint('/financials');
    else if (lower.includes('capital') && onNavigateHint) onNavigateHint('/capital');
  };

  return (
    <section className={mergeClasses(s.root, 'atlas-fade-in', className)} aria-label={title}>
      <div className={s.titleRow}>
        <SparkleRegular fontSize={22} className={s.sparkle} aria-hidden />
        <div>
          <Text weight="semibold" size={500} style={{ color: '#F1F5F9' }}>
            {title}
          </Text>
          <Caption1 style={{ color: 'rgba(241,245,249,0.72)' }}>{subtitle}</Caption1>
        </div>
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
        <Button
          appearance="primary"
          icon={<SendRegular />}
          onClick={() => run(value)}
          aria-label="Submit AI command"
        >
          Run
        </Button>
      </div>
      <div className={s.voiceReady} aria-hidden>
        <MicRegular fontSize={14} />
        <Caption1 style={{ color: 'rgba(241,245,249,0.65)' }}>Voice-ready layout</Caption1>
      </div>
      {localHistory.length > 0 ? (
        <div className={s.history} aria-label="Conversation history">
          {localHistory.map((h) => (
            <button key={h} type="button" className={s.historyItem} onClick={() => run(h)}>
              {h}
            </button>
          ))}
        </div>
      ) : null}
      {response ? (
        <div className={s.response} role="status">
          <Text size={300} style={{ color: '#F1F5F9' }}>
            {response}
          </Text>
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button size="small" appearance="secondary" onClick={() => onNavigateHint?.('/tasks')}>
              Review tasks
            </Button>
            <Button size="small" appearance="secondary" onClick={() => onNavigateHint?.('/documents')}>
              Open documents
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export interface AICommandDrawerProps extends GlobalAICommandPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AICommandDrawer({ open, onOpenChange, ...panelProps }: AICommandDrawerProps) {
  return (
    <Drawer open={open} position="end" size="medium" onOpenChange={(_, d) => onOpenChange(d.open)}>
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              aria-label="Close AI Command Center"
              icon={<DismissRegular />}
              onClick={() => onOpenChange(false)}
            />
          }
        >
          Atlas Copilot
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody>
        <GlobalAICommandPanel {...panelProps} />
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
