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
import type { ReactNode, FormEvent } from 'react';
import { EmptyState } from './EmptyState';
import { LoadingState } from './EmptyState';

export interface DataColumn<T> {
  key: string;
  header: string;
  width?: string | number;
  render: (row: T) => ReactNode;
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
    width: '100%',
    overflowX: 'auto',
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    boxShadow: '0 1px 2px rgba(11, 31, 51, 0.04)',
  },
  table: {
    minWidth: '640px',
  },
  header: {
    backgroundColor: tokens.colorNeutralBackground1,
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  row: {
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground3,
    },
  },
  cell: {
    paddingTop: '12px',
    paddingBottom: '12px',
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
  if (loading) return <LoadingState rows={5} />;
  if (!rows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <div className={mergeClasses(s.wrap, className)}>
      <Table className={s.table} aria-label={ariaLabel}>
        <TableHeader className={s.header}>
          <TableRow>
            {columns.map((c) => (
              <TableHeaderCell key={c.key} style={c.width ? { width: c.width } : undefined}>
                {c.header}
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={getRowKey(row)} className={s.row}>
              {columns.map((c) => (
                <TableCell key={c.key} className={s.cell}>
                  <TableCellLayout>{c.render(row)}</TableCellLayout>
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
  return (
    <div className={s.field}>
      <label htmlFor={htmlFor} className={s.label}>
        <Text size={300} weight="semibold">
          {label}
        </Text>
      </label>
      {children}
      {hint ? (
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
