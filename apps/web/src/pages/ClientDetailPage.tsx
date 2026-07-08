import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { Client, Contact, Project } from '@facturation/core';
import { Badge, Button } from '@facturation/ui';
import { archiveClient, deleteClient, getClient, unarchiveClient } from '../lib/clients';
import { listContacts } from '../lib/contacts';
import { listProjects } from '../lib/projects';
import { useApiResource } from '../lib/useApiResource';
import { useConfirm } from '../components/Confirm';
import { useToast } from '../components/Toast';
import { InfosTab } from './client-detail/InfosTab';
import { ContactsTab } from './client-detail/ContactsTab';
import { ProjectsTab } from './client-detail/ProjectsTab';

type Tab = 'infos' | 'contacts' | 'projets';

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { notify } = useToast();
  const confirm = useConfirm();

  const [client, setClient] = useState<Client | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showArchivedContacts, setShowArchivedContacts] = useState(false);
  const [showArchivedProjects, setShowArchivedProjects] = useState(false);

  // Resolve the initial tab from the URL ?tab= param.
  // Contacts tab is only valid for COMPANY clients; fall back to 'infos' otherwise.
  const resolveInitialTab = useCallback(
    (loadedClient: Client): Tab => {
      const raw = searchParams.get('tab') as Tab | null;
      const valid: Tab[] = ['infos', 'contacts', 'projets'];
      if (!raw || !valid.includes(raw)) return 'infos';
      if (raw === 'contacts' && loadedClient.type === 'INDIVIDUAL') return 'infos';
      return raw;
    },
    [searchParams],
  );

  const [tab, setTab] = useState<Tab>('infos');

  const { data: clientData, loading, error: loadError } = useApiResource(
    () => (id ? getClient(id) : Promise.reject(new Error('Client introuvable'))),
    [id],
  );

  // Copie locale éditable (mutations d'archivage/infos) + onglet initial depuis l'URL.
  useEffect(() => {
    if (!clientData) return;
    setClient(clientData);
    setTab(resolveInitialTab(clientData));
  }, [clientData, resolveInitialTab]);

  const refreshContacts = useCallback(async (): Promise<void> => {
    if (!id) return;
    try {
      setContacts(await listContacts(id, { includeArchived: showArchivedContacts }));
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur de rafraîchissement.', 'error');
    }
  }, [id, notify, showArchivedContacts]);

  const refreshProjects = useCallback(async (): Promise<void> => {
    if (!id) return;
    try {
      setProjects(await listProjects({ companyId: id, includeArchived: showArchivedProjects }));
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur de rafraîchissement.', 'error');
    }
  }, [id, notify, showArchivedProjects]);

  useEffect(() => {
    void refreshContacts();
  }, [refreshContacts]);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  const handleArchive = async (): Promise<void> => {
    if (!client) return;
    setArchiving(true);
    try {
      const updated = client.archivedAt
        ? await unarchiveClient(client.id)
        : await archiveClient(client.id);
      setClient(updated);
      notify(updated.archivedAt ? 'Client archivé.' : 'Client désarchivé.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erreur lors de l'archivage.", 'error');
    } finally {
      setArchiving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!client) return;
    const ok = await confirm({
      tone: 'danger',
      confirmLabel: 'Supprimer',
      message: `Supprimer « ${client.companyName} » ? Cette action est définitive.`,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteClient(client.id);
      notify('Client supprimé.', 'success');
      navigate('/clients');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur lors de la suppression.', 'error');
      setDeleting(false);
    }
  };

  if (loading) {
    return <p className="p-4 text-sm text-muted">Chargement…</p>;
  }

  if (loadError || !client) {
    return (
      <div
        role="alert"
        className="mx-auto mt-8 max-w-lg rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger"
      >
        {loadError || 'Client introuvable.'}
      </div>
    );
  }

  const billingContacts = contacts.filter((c) => !c.archivedAt && c.isBillingContact);

  // Tabs available depend on client type (individuals have no sub-contacts).
  const tabLabels: { key: Tab; label: string }[] =
    client.type === 'INDIVIDUAL'
      ? [
          { key: 'infos', label: 'Infos' },
          { key: 'projets', label: 'Projets' },
        ]
      : [
          { key: 'infos', label: 'Infos' },
          { key: 'contacts', label: 'Contacts' },
          { key: 'projets', label: 'Projets' },
        ];

  const busy = archiving || deleting;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/clients"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-fg"
          >
            ← Clients
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-fg">{client.companyName}</h1>
            {client.archivedAt && <Badge tone="warning">Archivé</Badge>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void handleArchive()}
            disabled={busy}
          >
            {archiving
              ? '…'
              : client.archivedAt
                ? 'Désarchiver'
                : 'Archiver'}
          </Button>
          {client.deletable === true && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => void handleDelete()}
              disabled={busy}
            >
              {deleting ? '…' : 'Supprimer'}
            </Button>
          )}
        </div>
      </div>

      {/* Onglets */}
      <div className="flex w-fit gap-1 rounded-lg border border-border bg-surface-2 p-1">
        {tabLabels.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={[
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
              tab === key ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'infos' && (
        <InfosTab client={client} onUpdated={(c) => setClient(c)} />
      )}
      {tab === 'contacts' && client.type !== 'INDIVIDUAL' && (
        <ContactsTab
          companyId={client.id}
          contacts={contacts}
          showArchived={showArchivedContacts}
          onToggleArchived={() => setShowArchivedContacts((v) => !v)}
          onRefresh={() => void refreshContacts()}
        />
      )}
      {tab === 'projets' && (
        <ProjectsTab
          companyId={client.id}
          projects={projects}
          billingContacts={billingContacts}
          showArchived={showArchivedProjects}
          onToggleArchived={() => setShowArchivedProjects((v) => !v)}
          onRefresh={() => void refreshProjects()}
        />
      )}
    </div>
  );
}
