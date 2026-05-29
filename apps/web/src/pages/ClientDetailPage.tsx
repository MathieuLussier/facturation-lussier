import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Client, Contact, Project } from '@facturation/core';
import { getClient } from '../lib/clients';
import { listContacts } from '../lib/contacts';
import { listProjects } from '../lib/projects';
import { useToast } from '../components/Toast';
import { InfosTab } from './client-detail/InfosTab';
import { ContactsTab } from './client-detail/ContactsTab';
import { ProjectsTab } from './client-detail/ProjectsTab';

type Tab = 'infos' | 'contacts' | 'projets';

const TAB_LABELS: { key: Tab; label: string }[] = [
  { key: 'infos', label: 'Infos' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'projets', label: 'Projets' },
];

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { notify } = useToast();

  const [client, setClient] = useState<Client | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState<Tab>('infos');
  const [showArchivedContacts, setShowArchivedContacts] = useState(false);
  const [showArchivedProjects, setShowArchivedProjects] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    if (!id) return;
    setLoading(true);
    setLoadError('');
    try {
      // Les listes contacts/projets sont chargées par leurs effets dédiés
      // (refreshContacts/refreshProjects), qui gèrent aussi le filtre « archivés ».
      setClient(await getClient(id));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

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

  if (loading) {
    return <p className="p-4 text-sm text-muted">Chargement…</p>;
  }

  if (loadError || !client) {
    return (
      <div
        role="alert"
        className="mx-auto mt-8 max-w-lg rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger"
      >
        {loadError || 'Entreprise introuvable.'}
      </div>
    );
  }

  const billingContacts = contacts.filter((c) => !c.archivedAt && c.isBillingContact);

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/clients"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-fg"
        >
          ← Clients
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-fg">{client.companyName}</h1>
      </div>

      {/* Onglets */}
      <div className="flex w-fit gap-1 rounded-lg border border-border bg-surface-2 p-1">
        {TAB_LABELS.map(({ key, label }) => (
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
      {tab === 'contacts' && (
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
