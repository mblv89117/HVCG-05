import {
  makeStyles,
  mergeClasses,
  tokens,
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  TableCellLayout,
  Text,
  Input,
  Button,
  Checkbox,
  Dropdown,
  Option,
  Caption1,
} from '@fluentui/react-components';
import { SearchRegular, ArrowSortRegular, FilterRegular } from '@fluentui/react-icons';
import type { ReactNode, FormEvent, CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { EmptyState, LoadingState } from './EmptyState';
import { elevation } from '../tokens';

export interface DataColumn<T> {
  key: string;
  header: string;
  width?: string | number;
  minWidth?: number;
  sortable?: boolean;
  pinned?: 'left' | 'right';
  filterable?: boolean;
  render: (row: T) => ReactNode;
  getSortValue?: (row: T) => string | number;
  getFilterValue?: (row: T) => string;
}

export interface DataTableProps<T> {
  columns: DataColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  ariaLabel?: string;
  className?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  selectable?: boolean;
  bulkActions?: ReactNode;
  savedViews?: Array<{ id: string; label: string }>;
  activeViewId?: string;
  onViewChange?: (viewId: string) => void;
  onSelectionChange?: (keys: string[]) => void;
  toolbarExtra?: ReactNode;
}

const useStyles = makeStyles({
  shell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
  },
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolbarLeft: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    alignItems: 'center',
    flex: 1,
  },
  wrap: {
    width: '100%',
    overflowX: 'auto',
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: elevation.sm,
  },
  table: {
    minWidth: '640px',
  },
  header: {
    backgroundColor: tokens.colorNeutralBackground2,
  },
  headerBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: 'inherit',
    padding: 0,
    font: 'inherit',
  },
  pinned: {
    position: 'sticky',
    left: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    zIndex: 1,
  },
  resizeHandle: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '6px',
    cursor: 'col-resize',
  },
  bulkBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    borderRadius: '12px',
    background: 'rgba(37, 99, 235, 0.08)',
    border: '1px solid rgba(37, 99, 235, 0.18)',
  },
});

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  loading,
  emptyTitle = 'No records',
  emptyDescription = 'Nothing to show yet.',
  ariaLabel = 'Data table',
  className,
  searchable = false,
  searchPlaceholder = 'Search rows…',
  selectable = false,
  bulkActions,
  savedViews,
  activeViewId,
  onViewChange,
  onSelectionChange,
  toolbarExtra,
}: DataTableProps<T>) {
  const s = useStyles();
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [filterKey, setFilterKey] = useState<string>('all');

  const filterableCols = columns.filter((c) => c.filterable);

  const processed = useMemo(() => {
    let next = [...rows];
    const q = query.trim().toLowerCase();
    if (q) {
      next = next.filter((row) =>
        columns.some((c) => {
          const raw = c.getFilterValue?.(row) ?? String(c.render(row) ?? '');
          return raw.toLowerCase().includes(q);
        }),
      );
    }
    if (filterKey !== 'all' && filterableCols.length) {
      const col = filterableCols[0];
      next = next.filter((row) => (col.getFilterValue?.(row) ?? '') === filterKey);
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col) {
        next.sort((a, b) => {
          const av = col.getSortValue?.(a) ?? String(col.render(a) ?? '');
          const bv = col.getSortValue?.(b) ?? String(col.render(b) ?? '');
          if (av < bv) return sortDir === 'asc' ? -1 : 1;
          if (av > bv) return sortDir === 'asc' ? 1 : -1;
          return 0;
        });
      }
    }
    return next;
  }, [rows, query, sortKey, sortDir, columns, filterKey, filterableCols]);

  const selectedKeys = Object.keys(selected).filter((k) => selected[k]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const setAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    processed.forEach((row) => {
      next[getRowKey(row)] = checked;
    });
    setSelected(next);
    onSelectionChange?.(Object.keys(next).filter((k) => next[k]));
  };

  if (loading) return <LoadingState rows={5} />;

  return (
    <div className={mergeClasses(s.shell, className)}>
      {(searchable || savedViews?.length || toolbarExtra || filterableCols.length > 0) && (
        <div className={s.toolbar}>
          <div className={s.toolbarLeft}>
            {searchable ? (
              <Input
                appearance="outline"
                contentBefore={<SearchRegular />}
                placeholder={searchPlaceholder}
                value={query}
                onChange={(_, d) => setQuery(d.value)}
                aria-label="Search table"
                style={{ minWidth: 200, maxWidth: 320 }}
              />
            ) : null}
            {filterableCols.length ? (
              <Dropdown
                aria-label="Filter"
                placeholder="Filter"
                value={filterKey === 'all' ? 'All' : filterKey}
                selectedOptions={[filterKey]}
                onOptionSelect={(_, d) => setFilterKey(d.optionValue ?? 'all')}
                style={{ minWidth: 140 }}
              >
                <Option value="all" text="All">
                  All
                </Option>
                {Array.from(
                  new Set(
                    rows.map((r) => filterableCols[0].getFilterValue?.(r) ?? '').filter(Boolean),
                  ),
                ).map((v) => (
                  <Option key={v} value={v} text={v}>
                    {v}
                  </Option>
                ))}
              </Dropdown>
            ) : null}
            {savedViews?.length ? (
              <Dropdown
                aria-label="Saved view"
                placeholder="Saved view"
                value={savedViews.find((v) => v.id === activeViewId)?.label}
                selectedOptions={activeViewId ? [activeViewId] : []}
                onOptionSelect={(_, d) => d.optionValue && onViewChange?.(d.optionValue)}
                style={{ minWidth: 140 }}
              >
                {savedViews.map((v) => (
                  <Option key={v.id} value={v.id} text={v.label}>
                    {v.label}
                  </Option>
                ))}
              </Dropdown>
            ) : null}
            <Caption1>
              <FilterRegular style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {processed.length} rows
            </Caption1>
          </div>
          {toolbarExtra}
        </div>
      )}

      {selectable && selectedKeys.length > 0 ? (
        <div className={s.bulkBar} role="status">
          <Text size={300} weight="semibold">
            {selectedKeys.length} selected
          </Text>
          {bulkActions}
          <Button size="small" appearance="subtle" onClick={() => setAll(false)}>
            Clear
          </Button>
        </div>
      ) : null}

      {!processed.length ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className={s.wrap}>
          <Table className={s.table} aria-label={ariaLabel}>
            <TableHeader className={s.header}>
              <TableRow>
                {selectable ? (
                  <TableHeaderCell style={{ width: 44 }}>
                    <Checkbox
                      aria-label="Select all"
                      checked={selectedKeys.length === processed.length && processed.length > 0}
                      onChange={(_, d) => setAll(Boolean(d.checked))}
                    />
                  </TableHeaderCell>
                ) : null}
                {columns.map((c) => {
                  const width = widths[c.key] ?? c.width;
                  const style: CSSProperties = {
                    width,
                    minWidth: c.minWidth ?? 80,
                    position: 'relative',
                    ...(c.pinned === 'left' ? { position: 'sticky', left: selectable ? 44 : 0, zIndex: 2, background: tokens.colorNeutralBackground2 } : {}),
                  };
                  return (
                    <TableHeaderCell key={c.key} style={style} className={c.pinned ? s.pinned : undefined}>
                      {c.sortable ? (
                        <button type="button" className={s.headerBtn} onClick={() => toggleSort(c.key)}>
                          {c.header}
                          <ArrowSortRegular fontSize={14} />
                          {sortKey === c.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : null}
                        </button>
                      ) : (
                        c.header
                      )}
                      <span
                        className={s.resizeHandle}
                        role="separator"
                        aria-orientation="vertical"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startX = e.clientX;
                          const startW =
                            widths[c.key] ??
                            (typeof c.width === 'number' ? c.width : e.currentTarget.parentElement?.clientWidth ?? 140);
                          const onMove = (ev: MouseEvent) => {
                            setWidths((w) => ({
                              ...w,
                              [c.key]: Math.max(80, Number(startW) + (ev.clientX - startX)),
                            }));
                          };
                          const onUp = () => {
                            window.removeEventListener('mousemove', onMove);
                            window.removeEventListener('mouseup', onUp);
                          };
                          window.addEventListener('mousemove', onMove);
                          window.addEventListener('mouseup', onUp);
                        }}
                      />
                    </TableHeaderCell>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {processed.map((row) => {
                const key = getRowKey(row);
                return (
                  <TableRow key={key}>
                    {selectable ? (
                      <TableCell>
                        <Checkbox
                          aria-label={`Select row ${key}`}
                          checked={Boolean(selected[key])}
                          onChange={(_, d) => {
                            const next = { ...selected, [key]: Boolean(d.checked) };
                            setSelected(next);
                            onSelectionChange?.(Object.keys(next).filter((k) => next[k]));
                          }}
                        />
                      </TableCell>
                    ) : null}
                    {columns.map((c) => (
                      <TableCell
                        key={c.key}
                        style={
                          c.pinned === 'left'
                            ? {
                                position: 'sticky',
                                left: selectable ? 44 : 0,
                                background: tokens.colorNeutralBackground1,
                                zIndex: 1,
                                width: widths[c.key] ?? c.width,
                              }
                            : { width: widths[c.key] ?? c.width }
                        }
                      >
                        <TableCellLayout>{c.render(row)}</TableCellLayout>
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

const useForm = makeStyles({
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  row: {
    display: 'grid',
    gap: '12px',
    gridTemplateColumns: '1fr',
    '@media (min-width: 640px)': {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    },
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontWeight: tokens.fontWeightSemibold,
  },
  hint: {
    color: tokens.colorNeutralForeground2,
  },
  error: {
    color: '#DC2626',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  progress: {
    height: '6px',
    borderRadius: '999px',
    background: tokens.colorNeutralBackground3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    background: `linear-gradient(90deg, #2563EB, #C9A227)`,
    borderRadius: '999px',
    transition: 'width 200ms ease',
  },
});

export function AtlasForm({
  children,
  onSubmit,
  className,
  progress,
  autosaveLabel,
}: {
  children: ReactNode;
  onSubmit?: (e: FormEvent) => void;
  className?: string;
  progress?: number;
  autosaveLabel?: string;
}) {
  const s = useForm();
  return (
    <form className={mergeClasses(s.form, className)} onSubmit={onSubmit} noValidate>
      {typeof progress === 'number' ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <Caption1>Progress</Caption1>
            <Caption1>{Math.round(progress)}%</Caption1>
          </div>
          <div className={s.progress} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className={s.progressBar} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
          </div>
        </div>
      ) : null}
      {autosaveLabel ? <Caption1>{autosaveLabel}</Caption1> : null}
      {children}
    </form>
  );
}

export function FormRow({ children }: { children: ReactNode }) {
  const s = useForm();
  return <div className={s.row}>{children}</div>;
}

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  const s = useForm();
  return (
    <div className={s.field}>
      <label htmlFor={htmlFor} className={s.label}>
        <Text size={300} weight="semibold">
          {label}
        </Text>
      </label>
      {children}
      {error ? (
        <Text size={200} className={s.error}>
          {error}
        </Text>
      ) : hint ? (
        <Text size={200} className={s.hint}>
          {hint}
        </Text>
      ) : null}
    </div>
  );
}

export function FormActions({ children }: { children: ReactNode }) {
  const s = useForm();
  return <div className={s.actions}>{children}</div>;
}
