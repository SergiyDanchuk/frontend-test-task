import type { User } from './types';
import { LoginPage } from './components/LoginPage';
import { WebhookEditorModal } from './components/WebhookEditorModal';
import { WebhookListView } from './components/WebhookListView';
import { useAuth } from './hooks/useAuth';
import { useWebhookEditor } from './hooks/useWebhookEditor';
import { useWebhookList } from './hooks/useWebhookList';

export function App() {
  const auth = useAuth();

  if (auth.checking) {
    return (
      <main className="loading" aria-live="polite">
        Перевіряємо сесію…
      </main>
    );
  }

  if (!auth.user) return <LoginPage onLogin={auth.signIn} />;

  return <AuthenticatedApp user={auth.user} onLogout={auth.signOut} />;
}

interface AuthenticatedAppProps {
  user: User;
  onLogout: () => Promise<void>;
}

function AuthenticatedApp({ user, onLogout }: AuthenticatedAppProps) {
  const list = useWebhookList();
  const editor = useWebhookEditor(list.reload);

  return (
    <>
      <WebhookListView
        accountName={user.name}
        page={list.location.page}
        search={list.searchInput}
        onSearchChange={list.setSearchInput}
        onPageChange={(page) => list.navigate(page, list.location.search)}
        onEdit={(id) => void editor.openEditor(id)}
        onRetry={list.reload}
        data={list.result}
        loading={list.loading}
        error={list.error}
        onLogout={() => void onLogout()}
      />

      <WebhookEditorModal
        open={editor.open}
        targetId={editor.targetId}
        webhook={editor.webhook}
        loading={editor.loading}
        saving={editor.saving}
        errors={editor.errors}
        error={editor.error}
        onChange={editor.setWebhook}
        onClose={editor.closeEditor}
        onRetry={(id) => void editor.openEditor(id)}
        onSave={editor.save}
      />
    </>
  );
}
