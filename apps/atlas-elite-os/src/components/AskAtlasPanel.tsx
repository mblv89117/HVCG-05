import { useEffect, useState } from 'react';
import { Button, Input } from '@fluentui/react-components';
import { SendRegular } from '@fluentui/react-icons';
import { ASK_ATLAS_QUESTION, fetchOperatorRuntime, type OperatorRuntimeEnvelope } from '../integrations/hub/askAtlas';
import { HubHttpError } from '../integrations/hub/hubFetch';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { AskAtlasSurface } from './AskAtlasSurface';
import { askAtlasViewFromRuntime } from './askAtlasView';

function operatorMessage(err: unknown): string {
  if (err instanceof HubHttpError) return err.message;
  return err instanceof Error ? err.message : 'Ask Atlas could not be loaded from Hub.';
}

/**
 * Signed Elite Ask Atlas surface. Fetches Hub GET /operator/runtime.json?question=
 * only after a Hub Bearer exists. Unsigned / missing bearer never renders entitled items.
 * Question input is Ask Atlas only. PM capture is unsupported in production.
 */
export function AskAtlasPanel() {
  const auth = useHubAuth();
  const [draftQuestion, setDraftQuestion] = useState<string>(ASK_ATLAS_QUESTION);
  const [askedQuestion, setAskedQuestion] = useState<string>(ASK_ATLAS_QUESTION);
  const [envelope, setEnvelope] = useState<OperatorRuntimeEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);

  const tokenReady = auth.tokenReady;
  const hasBearer = auth.hasBearer;
  const accessToken = auth.accessToken;

  useEffect(() => {
    if (!tokenReady) return;
    if (!hasBearer || !accessToken) {
      setEnvelope(null);
      setError(null);
      setStatus(401);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void fetchOperatorRuntime(
      {
        userId: auth.userId,
        organizationId: auth.organizationId,
        clientIds: auth.clientIds,
        email: auth.email,
        roles: auth.roles,
        accessToken,
      },
      askedQuestion,
    )
      .then((next) => {
        if (cancelled) return;
        setEnvelope(next);
        setError(null);
        setStatus(200);
      })
      .catch((reason) => {
        if (cancelled) return;
        setEnvelope(null);
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
  }, [tokenReady, hasBearer, accessToken, auth.userId, auth.organizationId, auth.email, askedQuestion]);

  const view = askAtlasViewFromRuntime({
    signed: auth.hasBearer,
    envelope,
    loading: !auth.tokenReady || loading,
    error,
    status,
  });

  const submitQuestion = () => {
    if (!auth.hasBearer) return;
    setAskedQuestion(draftQuestion.trim() || ASK_ATLAS_QUESTION);
  };

  return (
    <div>
      <form
        data-testid="ask-atlas-question-form"
        onSubmit={(event) => {
          event.preventDefault();
          submitQuestion();
        }}
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}
      >
        <Input
          data-testid="ask-atlas-question-input"
          aria-label="Ask Atlas question"
          style={{ flex: 1, minWidth: 240 }}
          value={draftQuestion}
          disabled={!auth.hasBearer}
          placeholder={ASK_ATLAS_QUESTION}
          onChange={(_, data) => setDraftQuestion(data.value)}
        />
        <Button
          appearance="primary"
          icon={<SendRegular />}
          type="submit"
          disabled={!auth.hasBearer}
          data-testid="ask-atlas-question-submit"
        >
          Ask
        </Button>
      </form>
      <AskAtlasSurface view={view} />
    </div>
  );
}
