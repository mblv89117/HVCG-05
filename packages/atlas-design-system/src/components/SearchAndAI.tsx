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
} from '@fluentui/react-components';
import { SearchRegular, SparkleRegular, SendRegular } from '@fluentui/react-icons';
import type { ReactNode } from 'react';
import { useState } from 'react';

export interface SearchResult {
  id: string;
  title: string;
  category: string;
  subtitle?: string;
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
          <DialogTitle>Search Atlas</DialogTitle>
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
    background: `linear-gradient(135deg, rgba(15, 61, 44, 0.92), rgba(26, 92, 66, 0.88))`,
    color: '#f2eee6',
    boxShadow: '0 12px 32px rgba(12, 22, 18, 0.18)',
    border: '1px solid rgba(176, 138, 60, 0.35)',
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
    border: '1px solid rgba(242, 238, 230, 0.35)',
    backgroundColor: 'rgba(242, 238, 230, 0.08)',
    color: '#f2eee6',
    borderRadius: '999px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: tokens.fontSizeBase200,
    ':hover': {
      backgroundColor: 'rgba(176, 138, 60, 0.28)',
      border: '1px solid rgba(176, 138, 60, 0.65)',
    },
    ':focus-visible': {
      outline: '2px solid #d4af5a',
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
}

export function GlobalAICommandPanel({
  examples = DEFAULT_AI_EXAMPLES,
  onSubmit,
  placeholder = 'Ask Atlas Copilot…',
  title = 'AI Command Center',
  subtitle = 'Development stubs only — no live client actions.',
  className,
  stubResponder = (p) =>
    `Dev stub: received “${p}”. Live Copilot / client communications are disabled in Development.`,
}: GlobalAICommandPanelProps) {
  const s = useAi();
  const [value, setValue] = useState('');
  const [response, setResponse] = useState<string | null>(null);

  const run = (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    onSubmit?.(trimmed);
    setResponse(stubResponder(trimmed));
  };

  return (
    <section className={mergeClasses(s.root, 'atlas-fade-in', className)} aria-label={title}>
      <div className={s.titleRow}>
        <SparkleRegular fontSize={22} aria-hidden />
        <div>
          <Text weight="semibold" size={500} style={{ color: '#f2eee6' }}>
            {title}
          </Text>
          <Caption1 style={{ color: 'rgba(242,238,230,0.82)' }}>{subtitle}</Caption1>
        </div>
      </div>
      <div className={s.examples} aria-label="Example prompts">
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
      {response ? (
        <div className={s.response} role="status">
          <Text size={300} style={{ color: '#f2eee6' }}>
            {response}
          </Text>
        </div>
      ) : null}
    </section>
  );
}

export function BrandMark({
  src = '/brand/hvcg-logo.svg',
  height = 40,
}: {
  src?: string;
  height?: number;
}): ReactNode {
  return <img src={src} alt="High Value Capital Group" style={{ height, width: 'auto' }} />;
}
