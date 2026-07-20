import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@fluentui/react-components';
import type { ButtonProps } from '@fluentui/react-components';

/** Fluent Button + react-router navigation without `as={Link}` typing issues. */
export function NavButton({
  to,
  children,
  appearance = 'secondary',
  size,
}: {
  to: string;
  children: React.ReactNode;
  appearance?: ButtonProps['appearance'];
  size?: ButtonProps['size'];
}) {
  const navigate = useNavigate();
  return (
    <Button appearance={appearance} size={size} onClick={() => navigate(to)}>
      {children}
    </Button>
  );
}

export function TextLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} style={{ color: 'inherit', fontWeight: 600 }}>
      {children}
    </Link>
  );
}
