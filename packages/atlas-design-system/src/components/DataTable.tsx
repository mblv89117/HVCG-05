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
} from '@fluentui/react-components';
import type { FormEvent, KeyboardEvent, ReactNode } from 'react';
import { useId } from 'react';
import { EmptyState } from './EmptyState';
import { LoadingState } from './EmptyState';

export interface DataColumn<T> {
  key: string;
  header: string;
  width?: string | number;
  render: (row: T) => ReactNode;
  /** Stick first column (project) or last actions column while scrolling. */
  sticky?: 'left' | 'right';
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
}

const useStyles = makeStyles({
  wrap: {
    position: 'relative',
    width: '100%',
    overflow: 'auto',
    maxHeight: 'min(70vh, 800px)',
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    boxShadow: '0 1px 2px rgba(11, 31, 51, 0.04)',
    scrollbarGutter: 'stable',
    ':focus-visible': {
      outline: `2px solid ${tokens.colorStrokeFocus2}`,
      outlineOffset: '-2px',
    },
  },
  table: {
    minWidth: '1100px',
    borderCollapse: 'separate',
    borderSpacing: 0,
  },
  header: {
    backgroundColor: tokens.colorNeutralBackground1,
    position: 'sticky',
    top: 0,
    zIndex: 2,
  },
  headerCell: {
    minHeight: '44px',
  },
  row: {
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground3,
    },
  },
  cell: {
    paddingTop: '12px',
    paddingBottom: '12px',
    minHeight: '44px',
  },
  visuallyHidden: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  },
  stickyLeft: {
    position: 'sticky',
    left: 0,
    zIndex: 3,
    backgroundColor: tokens.colorNeutralBackground2,
    boxShadow: '2px 0 4px rgba(11, 31, 51, 0.06)',
  },
  stickyRight: {
    position: 'sticky',
    right: 0,
    zIndex: 3,
    backgroundColor: tokens.colorNeutralBackground2,
    boxShadow: '-2px 0 4px rgba(11, 31, 51, 0.06)',
    minWidth: '148px',
  },
  stickyHeaderLeft: {
    position: 'sticky',
    left: 0,
    zIndex: 4,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: '2px 0 4px rgba(11, 31, 51, 0.06)',
  },
  stickyHeaderRight: {
    position: 'sticky',
    right: 0,
    zIndex: 4,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: '-2px 0 4px rgba(11, 31, 51, 0.06)',
    minWidth: '148px',
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
}: DataTableProps<T>) {
  const s = useStyles();
  const captionId = useId();
  const hintId = useId();
  if (loading) return <LoadingState rows={5} />;
  if (!rows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const onScrollerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const node = event.currentTarget;
    const stepX = 64;
    const stepY = 64;
    switch (event.key) {
      case 'ArrowRight':
        node.scrollLeft += stepX;
        event.preventDefault();
        break;
      case 'ArrowLeft':
        node.scrollLeft -= stepX;
        event.preventDefault();
        break;
      case 'ArrowDown':
        node.scrollTop += stepY;
        event.preventDefault();
        break;
      case 'ArrowUp':
        node.scrollTop -= stepY;
        event.preventDefault();
        break;
      case 'PageDown':
        node.scrollTop += node.clientHeight * 0.9;
        event.preventDefault();
        break;
      case 'PageUp':
        node.scrollTop -= node.clientHeight * 0.9;
        event.preventDefault();
        break;
      case 'Home':
        node.scrollLeft = 0;
        if (event.ctrlKey) node.scrollTop = 0;
        event.preventDefault();
        break;
      case 'End':
        node.scrollLeft = node.scrollWidth;
        if (event.ctrlKey) node.scrollTop = node.scrollHeight;
        event.preventDefault();
        break;
      default:
        break;
    }
  };

  return (
    <div
      className={mergeClasses(s.wrap, className)}
      tabIndex={0}
      role="region"
      aria-labelledby={captionId}
      aria-describedby={hintId}
      onKeyDown={onScrollerKeyDown}
    >
      <span id={captionId} className={s.visuallyHidden}>
        {ariaLabel}
      </span>
      <span id={hintId} className={s.visuallyHidden}>
        Scroll for more columns or rows. When this region is focused, use arrow keys, Page Up, Page Down, Home, and End.
      </span>
      <Table className={s.table} aria-labelledby={captionId}>
        <TableHeader className={s.header}>
          <TableRow>
            {columns.map((c) => (
              <TableHeaderCell
                key={c.key}
                style={c.width ? { width: c.width } : undefined}
                className={mergeClasses(
                  s.headerCell,
                  c.sticky === 'left' ? s.stickyHeaderLeft : undefined,
                  c.sticky === 'right' ? s.stickyHeaderRight : undefined,
                )}
              >
                {c.header}
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={getRowKey(row)} className={s.row}>
              {columns.map((c) => (
                <TableCell
                  key={c.key}
                  className={mergeClasses(
                    s.cell,
                    c.sticky === 'left' ? s.stickyLeft : undefined,
                    c.sticky === 'right' ? s.stickyRight : undefined,
                  )}
                >
                  <TableCellLayout truncate={c.key === 'action' || c.key === 'next'}>
                    {c.render(row)}
                  </TableCellLayout>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
  actions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
});

export function AtlasForm({
  children,
  onSubmit,
  className,
}: {
  children: ReactNode;
  onSubmit?: (e: FormEvent) => void;
  className?: string;
}) {
  const s = useForm();
  return (
    <form className={mergeClasses(s.form, className)} onSubmit={onSubmit} noValidate>
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
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  const s = useForm();
  const hintId = useId();
  const labelId = useId();
  return (
    <div className={s.field} role="group" aria-labelledby={labelId} aria-describedby={hint ? hintId : undefined}>
      <label htmlFor={htmlFor} className={s.label} id={labelId}>
        <Text size={300} weight="semibold">
          {label}
        </Text>
      </label>
      {children}
      {hint ? (
        <Text size={200} className={s.hint} id={hintId}>
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
