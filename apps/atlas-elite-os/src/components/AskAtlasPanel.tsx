import { useEffect, useState } from 'react';
import { HubHttpError } from '../integrations/hub/hubFetch';
import { fetchOperatorAskAtlas, type AskAtlasAnswer } from '../integrations/hub/askAtlas';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { AskAtlasSurface } from './AskAtlasSurface';
import { askAtlasView } from './askAtlasView';

function operatorMessage(err: unknown): string {
  if (err instanceof HubHttpError) return err.message;
  return err instanceof Error ? err.message : 'Ask Atlas could not be loaded from Hub.';
}

/**
 * Signed Elite Ask Atlas surface. Fetches Hub GET /operator.json only after a Hub Bearer exists.
 * Unsigned / missing bearer never renders entitled items.
 */
export function AskAtlasPanel() {
  const auth = useHubAuth();
  const [payload, setPayload] = useState<AskAtlasAnswer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);

  const tokenReady = auth.tokenReady;
  const hasBearer = auth.hasBearer;
  const accessToken = auth.accessToken;

  useEffect(() => {
    if (!tokenReady) return;
    if (!hasBearer || !accessToken) {
      setPayload(null);
      setError(null);
      setStatus(401);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void fetchOperatorAskAtlas({
      userId: auth.userId,
      organizationId: auth.organizationId,
      clientIds: auth.clientIds,
      email: auth.email,
      roles: auth.roles,
      accessToken,
    })
      .then((answer) => {
        if (cancelled) return;
        setPayload(answer);
        setError(null);
        setStatus(200);
      })
      .catch((reason) => {
        if (cancelled) return;
        setPayload(null);
        setStatus(reason instanceof HubHttpError ? reason.status : 0);
        setError(operatorMessage(reason));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // Hub Bearer identity is the fail-closed gate. Scope headers are not a second fetch key.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clientIds/roles are new arrays each render
  }, [tokenReady, hasBearer, accessToken, auth.userId, auth.organizationId, auth.email]);

  const view = askAtlasView({
    signed: auth.hasBearer,
    payload,
    loading: !auth.tokenReady || loading,
    error,
    status,
  });

  return <AskAtlasSurface view={view} />;
}
