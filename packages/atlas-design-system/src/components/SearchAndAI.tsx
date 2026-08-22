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
  Spinner,
} from '@fluentui/react-components';
import {
  SearchRegular,
  SparkleRegular,
  SendRegular,
  DismissRegular,
  MicRegular,
} from '@fluentui/react-icons';
import type { KeyboardEvent, ReactNode } from 'react';
import { useEffect, useId, useRef, useState } from 'react';

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
  /** Shown when the query has text and nothing matched. */
  emptyLabel?: string;
  /** Shown when the field is empty and there are no commands to list. */
  idleLabel?: string;
  /** Hub / async fetch in flight. Parent should set this; defaults stay false. */
  loading?: boolean;
  loadingLabel?: string;
  placeholder?: string;
  title?: string;
  inputLabel?: string;
  listLabel?: string;
  /** Dialog (⌘K) or page-embedded command surface. */
  variant?: 'dialog' | 'inline';
  autoFocus?: boolean;
}

const useSearch = makeStyles({
  surface: {
    maxWidth: '640px',
    width: 'calc(100vw - 24px)',
  },
  inline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%',
  },
  kbd: {
    marginLeft: 'auto',
    padding: '2px 6px',
    borderRadius: '4px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground2,
    fontFamily: tokens.fontFamilyMonospace,
    lineHeight: '1.2',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    marginTop: '4px',
    maxHeight: '360px',
    overflow: 'auto',
    padding: '4px 0',
  },
  listInline: {
    maxHeight: 'min(70vh, 640px)',
  },
  listCollapsed: {
    display: 'none',
  },
  group: {
    padding: '10px 12px 4px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: tokens.colorNeutralForeground3,
  },
  item: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    minHeight: '44px',
    borderRadius: tokens.borderRadiusMedium,
    border: 'none',
    background: 'transparent',
    textAlign: 'left',
    cursor: 'pointer',
    color: tokens.colorNeutralForeground1,
    width: '100%',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground3,
    },
    ':focus-visible': {
      outline: `2px solid ${tokens.colorStrokeFocus2}`,
      outlineOffset: '1px',
    },
  },
  itemBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
    flex: 1,
  },
  itemActive: {
    backgroundColor: tokens.colorNeutralBackground3,
  },
  enterHint: {
    marginLeft: 'auto',
    flexShrink: 0,
    opacity: 0.7,
  },
  empty: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '16px 8px 8px',
  },
  status: {
    minHeight: '20px',
  },
  hints: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    paddingTop: '8px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    marginTop: '8px',
    color: tokens.colorNeutralForeground3,
  },
  hint: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  srOnly: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    whiteSpace: 'nowrap',
    border: 0,
  },
});

function commandStatus(opts: {
  query: string;
  resultCount: number;
  loading: boolean;
  idleLabel: string;
  emptyLabel: string;
  loadingLabel: string;
}): string {
  if (opts.loading && opts.resultCount === 0) return opts.loadingLabel;
  if (opts.loading) return `${opts.loadingLabel} · ${opts.resultCount} shown`;
  if (opts.resultCount === 0) return opts.query.trim() ? opts.emptyLabel : opts.idleLabel;
  if (!opts.query.trim()) {
    return `${opts.resultCount} command${opts.resultCount === 1 ? '' : 's'}`;
  }
  return `${opts.resultCount} match${opts.resultCount === 1 ? '' : 'es'}`;
}

function SearchCommandSurface({
  open,
  onOpenChange,
  query,
  onQueryChange,
  results,
  onSelect,
  emptyLabel,
  idleLabel,
  loading,
  loadingLabel,
  placeholder,
  inputLabel,
  listLabel,
  autoFocus,
  variant,
}: Required<
  Pick<
    GlobalSearchProps,
    | 'open'
    | 'onOpenChange'
    | 'query'
    | 'onQueryChange'
    | 'results'
    | 'onSelect'
    | 'emptyLabel'
    | 'idleLabel'
    | 'loading'
    | 'loadingLabel'
    | 'placeholder'
    | 'inputLabel'
    | 'listLabel'
    | 'autoFocus'
    | 'variant'
  >
>) {
  const s = useSearch();
  const listId = useId();
  const hintId = useId();
  const statusId = useId();
  const [activeIndex, setActiveIndex] = useState(0);
  const highlightIdRef = useRef<string | undefined>(undefined);
  const queryRef = useRef(query);

  const highlight = (index: number) => {
    const next = Math.max(0, Math.min(index, Math.max(results.length - 1, 0)));
    highlightIdRef.current = results[next]?.id;
    setActiveIndex(next);
  };

  useEffect(() => {
    if (queryRef.current !== query) {
      queryRef.current = query;
      highlightIdRef.current = undefined;
      setActiveIndex(0);
      return;
    }
    const id = highlightIdRef.current;
    const next = id ? results.findIndex((r) => r.id === id) : 0;
    setActiveIndex(next >= 0 ? next : 0);
  }, [query, results]);

  useEffect(() => {
    if (!open || !results.length) return;
    const optionId = `${listId}-opt-${results[activeIndex]?.id ?? ''}`;
    document.getElementById(optionId)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, listId, open, results]);

  const select = (result: SearchResult) => {
    onSelect(result);
    if (variant === 'dialog') onOpenChange(false);
  };

  const onQueryKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      if (query) {
        event.preventDefault();
        event.stopPropagation();
        onQueryChange('');
      } else {
        onOpenChange(false);
      }
      return;
    }
    if (!results.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      highlight((activeIndex + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      highlight((activeIndex - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const result = results[activeIndex];
      if (result) select(result);
    } else if (event.key === 'Home') {
      event.preventDefault();
      highlight(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      highlight(results.length - 1);
    } else if (event.key === 'PageDown') {
      event.preventDefault();
      highlight(Math.min(activeIndex + 5, results.length - 1));
    } else if (event.key === 'PageUp') {
      event.preventDefault();
      highlight(Math.max(activeIndex - 5, 0));
    }
  };

  const activeOption = results[activeIndex];
  const activeId = activeOption ? `${listId}-opt-${activeOption.id}` : undefined;
  const statusText = commandStatus({
    query,
    resultCount: results.length,
    loading,
    idleLabel,
    emptyLabel,
    loadingLabel,
  });
  const showEmpty = !results.length;
  const trimmed = query.trim();

  return (
    <div className={variant === 'inline' ? s.inline : undefined}>
      <span id={hintId} className={s.srOnly}>
        Use Up and Down arrows to move. Enter opens the highlighted command. Escape clears the
        query, or closes Command-K when the field is empty.
      </span>
      <Input
        type="search"
        appearance="outline"
        contentBefore={<SearchRegular aria-hidden />}
        placeholder={placeholder}
        value={query}
        onChange={(_, d) => onQueryChange(d.value)}
        onKeyDown={onQueryKeyDown}
        aria-label={inputLabel}
        aria-describedby={`${hintId} ${statusId}`}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-activedescendant={activeId}
        aria-expanded={open}
        aria-busy={loading}
        role="combobox"
        autoComplete="off"
        autoFocus={autoFocus}
      />
      <Caption1 id={statusId} className={s.status} role="status" aria-live="polite">
        {statusText}
      </Caption1>
      {showEmpty ? (
        <div className={s.empty}>
          {loading ? <Spinner size="tiny" aria-hidden /> : null}
          <Caption1>
            {loading ? loadingLabel : trimmed ? emptyLabel : idleLabel}
          </Caption1>
        </div>
      ) : null}
      <div
        id={listId}
        className={mergeClasses(
          s.list,
          variant === 'inline' && s.listInline,
          showEmpty && s.listCollapsed,
        )}
        role="listbox"
        hidden={showEmpty}
        aria-busy={loading}
      >
        {results.map((r, index) => {
          const prev = results[index - 1];
          const showGroup = !prev || prev.category !== r.category;
          return (
            <div key={r.id} role="presentation">
              {showGroup ? (
                <Caption1 className={s.group} aria-hidden>
                  {r.category}
                </Caption1>
              ) : null}
              <button
                id={`${listId}-opt-${r.id}`}
                type="button"
                className={mergeClasses(s.item, index === activeIndex && s.itemActive)}
                role="option"
                aria-selected={index === activeIndex}
                aria-label={`${r.title}, ${r.category}${r.subtitle ? `, ${r.subtitle}` : ''}`}
                tabIndex={-1}
                onClick={() => select(r)}
                onMouseEnter={() => highlight(index)}
              >
                <span className={s.itemBody}>
                  <Text weight="semibold">{r.title}</Text>
                  <Caption1>
                    {r.category}
                    {r.subtitle ? ` · ${r.subtitle}` : ''}
                  </Caption1>
                </span>
                {index === activeIndex ? (
                  <Caption1 className={mergeClasses(s.kbd, s.enterHint)} aria-hidden>
                    ↵
                  </Caption1>
                ) : null}
              </button>
            </div>
          );
        })}
      </div>
      <div className={s.hints} aria-hidden>
        <span className={s.hint}>
          <Caption1 className={s.kbd}>↑</Caption1>
          <Caption1 className={s.kbd}>↓</Caption1>
          <Caption1>Move</Caption1>
        </span>
        <span className={s.hint}>
          <Caption1 className={s.kbd}>↵</Caption1>
          <Caption1>Open</Caption1>
        </span>
        {variant === 'dialog' || trimmed ? (
          <span className={s.hint}>
            <Caption1 className={s.kbd}>esc</Caption1>
            <Caption1>{trimmed ? 'Clear' : 'Close'}</Caption1>
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function GlobalSearch({
  open,
  onOpenChange,
  query,
  onQueryChange,
  results,
  onSelect,
  emptyLabel = 'No matches. Try a client, project, document, or module name.',
  idleLabel = 'Jump to a module, or type two characters to search.',
  loading = false,
  loadingLabel = 'Searching…',
  placeholder = 'Search Atlas…',
  title = 'Atlas Command',
  inputLabel = 'Atlas command',
  listLabel = 'Commands and search results',
  variant = 'dialog',
  autoFocus,
}: GlobalSearchProps) {
  const s = useSearch();
  const focus = autoFocus ?? variant === 'dialog';
  const surface = (
    <SearchCommandSurface
      open={open}
      onOpenChange={onOpenChange}
      query={query}
      onQueryChange={onQueryChange}
      results={results}
      onSelect={onSelect}
      emptyLabel={emptyLabel}
      idleLabel={idleLabel}
      loading={loading}
      loadingLabel={loadingLabel}
      placeholder={placeholder}
      inputLabel={inputLabel}
      listLabel={listLabel}
      autoFocus={focus}
      variant={variant}
    />
  );

  if (variant === 'inline') {
    return surface;
  }

  return (
    <Dialog open={open} onOpenChange={(_, d) => onOpenChange(d.open)}>
      <DialogSurface id="atlas-command-palette" className={s.surface} aria-label={title}>
        <DialogBody>
          <DialogTitle action={<Caption1 className={s.kbd} aria-hidden>⌘K</Caption1>}>
            {title}
          </DialogTitle>
          <DialogContent>{surface}</DialogContent>
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
    border: '1px solid rgba(241, 245, 249, 0.35)',
    backgroundColor: 'rgba(241, 245, 249, 0.08)',
    color: '#F8FAFC',
    borderRadius: '999px',
    padding: '8px 14px',
    minHeight: '44px',
    cursor: 'pointer',
    fontSize: tokens.fontSizeBase200,
    transitionProperty: 'background-color, border-color',
    transitionDuration: '120ms',
    ':hover': {
      backgroundColor: 'rgba(201, 162, 39, 0.22)',
      border: '1px solid rgba(201, 162, 39, 0.55)',
    },
    ':focus-visible': {
      outline: '2px solid #93C5FD',
      outlineOffset: '2px',
    },
  },
  row: {
    display: 'flex',
    gap: '8px',
    alignItems: 'stretch',
    flexWrap: 'wrap',
  },
  submit: {
    minHeight: '44px',
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
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  historyItem: {
    display: 'block',
    width: '100%',
    padding: '10px 12px',
    minHeight: '44px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: 'rgba(255,255,255,0.04)',
    border: 'none',
    color: '#E2E8F0',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: tokens.fontSizeBase200,
    ':hover': {
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    ':focus-visible': {
      outline: '2px solid #93C5FD',
      outlineOffset: '2px',
    },
  },
  voiceReady: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#CBD5E1',
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
          <Text as="h2" weight="semibold" size={500} style={{ color: '#F8FAFC' }}>
            {title}
          </Text>
          <Caption1 style={{ color: '#E2E8F0' }}>{subtitle}</Caption1>
        </div>
      </div>
      <div className={s.examples} role="group" aria-label="Suggested prompts">
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
      <form
        className={s.row}
        onSubmit={(event) => {
          event.preventDefault();
          run(value);
        }}
      >
        <div className={s.inputGrow}>
          <Input
            appearance="filled-darker"
            value={value}
            placeholder={placeholder}
            onChange={(_, d) => setValue(d.value)}
            aria-label="AI command prompt"
          />
        </div>
        <Button
          appearance="primary"
          className={s.submit}
          icon={<SendRegular aria-hidden />}
          type="submit"
          aria-label="Submit AI command"
        >
          Run
        </Button>
      </form>
      <div className={s.voiceReady} aria-hidden>
        <MicRegular fontSize={14} />
        <Caption1 style={{ color: '#CBD5E1' }}>Voice-ready layout</Caption1>
      </div>
      {localHistory.length > 0 ? (
        <ul className={s.history} aria-label="Conversation history">
          {localHistory.map((h) => (
            <li key={h}>
              <button type="button" className={s.historyItem} onClick={() => run(h)}>
                {h}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {response ? (
        <div className={s.response} role="status" aria-live="polite">
          <Text size={300} style={{ color: '#F8FAFC' }}>
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
              style={{ minWidth: 44, minHeight: 44 }}
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
