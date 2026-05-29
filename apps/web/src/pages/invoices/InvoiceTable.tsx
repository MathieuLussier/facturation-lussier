import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button } from '@facturation/ui';
import { formatCents, type Invoice, type InvoiceStatus } from '@facturation/core';
import { StatusSelect } from '../../components/StatusSelect';
import {
  formatInvoiceNumber,
  groupInvoices,
  relativeDueLabel,
  type InvoiceGroupBy,
} from '../../lib/invoice-view';

interface InvoiceTableProps {
  items: Invoice[];
  groupBy: InvoiceGroupBy;
  onStatusChange: (id: string, status: InvoiceStatus) => void;
  onToggleArchive: (inv: Invoice) => void;
}

export function InvoiceTable({
  items,
  groupBy,
  onStatusChange,
  onToggleArchive,
}: InvoiceTableProps) {
  const navigate = useNavigate();
  const today = new Date();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const groups = groupInvoices(items, groupBy);

  const totalSubtotal = items.reduce((s, inv) => s + inv.subtotalCents, 0);
  const totalTotal = items.reduce((s, inv) => s + inv.totalCents, 0);

  function toggleCollapse(key: string): void {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium text-muted">
            <th className="px-4 py-2.5 whitespace-nowrap">N°</th>
            <th className="px-4 py-2.5">Client</th>
            <th className="px-4 py-2.5 whitespace-nowrap">Date de facturation</th>
            <th className="px-4 py-2.5 whitespace-nowrap">Échéance</th>
            <th className="px-4 py-2.5 text-right whitespace-nowrap">Taxes exclues</th>
            <th className="px-4 py-2.5 text-right whitespace-nowrap">Total</th>
            <th className="px-4 py-2.5">Statut</th>
            <th className="px-4 py-2.5">Action</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const isCollapsed = collapsed.has(group.key);

            return (
              <GroupRows
                key={group.key}
                group={group}
                showHeader={groupBy !== 'none'}
                isCollapsed={isCollapsed}
                onToggleCollapse={() => toggleCollapse(group.key)}
                today={today}
                onStatusChange={onStatusChange}
                onToggleArchive={onToggleArchive}
                onRowClick={(id) => navigate(`/invoices/${id}`)}
              />
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border font-semibold text-fg">
            <td className="px-4 py-2.5" colSpan={4}>
              Total
            </td>
            <td className="px-4 py-2.5 text-right tabular-nums">{formatCents(totalSubtotal)}</td>
            <td className="px-4 py-2.5 text-right tabular-nums">{formatCents(totalTotal)}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GroupRows — renders one group header (optional) + its invoice rows
// ---------------------------------------------------------------------------

interface GroupRowsProps {
  group: ReturnType<typeof groupInvoices>[number];
  showHeader: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  today: Date;
  onStatusChange: (id: string, status: InvoiceStatus) => void;
  onToggleArchive: (inv: Invoice) => void;
  onRowClick: (id: string) => void;
}

function GroupRows({
  group,
  showHeader,
  isCollapsed,
  onToggleCollapse,
  today,
  onStatusChange,
  onToggleArchive,
  onRowClick,
}: GroupRowsProps) {
  return (
    <>
      {showHeader && (
        <tr
          className="cursor-pointer select-none bg-surface-2 hover:brightness-[0.97]"
          onClick={onToggleCollapse}
        >
          <td className="px-4 py-2 font-medium text-fg" colSpan={4}>
            <span className="mr-2 text-xs">{isCollapsed ? '▸' : '▾'}</span>
            {group.label}
            <span className="ml-2 font-normal text-muted">({group.invoices.length})</span>
          </td>
          <td className="px-4 py-2 text-right tabular-nums font-medium text-fg">
            {formatCents(group.subtotalCents)}
          </td>
          <td className="px-4 py-2 text-right tabular-nums font-medium text-fg">
            {formatCents(group.totalCents)}
          </td>
          <td colSpan={2} />
        </tr>
      )}

      {!isCollapsed &&
        group.invoices.map((inv) => (
          <InvoiceRow
            key={inv.id}
            inv={inv}
            today={today}
            onStatusChange={onStatusChange}
            onToggleArchive={onToggleArchive}
            onRowClick={onRowClick}
          />
        ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// InvoiceRow — single invoice table row
// ---------------------------------------------------------------------------

interface InvoiceRowProps {
  inv: Invoice;
  today: Date;
  onStatusChange: (id: string, status: InvoiceStatus) => void;
  onToggleArchive: (inv: Invoice) => void;
  onRowClick: (id: string) => void;
}

function InvoiceRow({ inv, today, onStatusChange, onToggleArchive, onRowClick }: InvoiceRowProps) {
  const dueLabel = relativeDueLabel(inv.dueDate, inv.status, today);

  return (
    <tr
      className="cursor-pointer border-b border-border transition-colors hover:bg-surface-2"
      onClick={() => onRowClick(inv.id)}
    >
      <td className="px-4 py-2.5 whitespace-nowrap font-medium text-fg">
        <span className="flex items-center gap-2">
          {formatInvoiceNumber(inv.number)}
          {inv.archivedAt && <Badge tone="warning">Archivé</Badge>}
        </span>
      </td>

      <td className="px-4 py-2.5 text-fg">{inv.client?.companyName ?? '—'}</td>

      <td className="px-4 py-2.5 text-muted tabular-nums">{inv.issueDate.slice(0, 10)}</td>

      <td
        className={`px-4 py-2.5 tabular-nums whitespace-nowrap ${
          dueLabel.overdue ? 'font-medium text-danger' : 'text-muted'
        }`}
        title={inv.dueDate ? inv.dueDate.slice(0, 10) : undefined}
      >
        {dueLabel.text}
      </td>

      <td className="px-4 py-2.5 text-right tabular-nums text-fg">
        {formatCents(inv.subtotalCents)}
      </td>

      <td className="px-4 py-2.5 text-right tabular-nums font-medium text-fg">
        {formatCents(inv.totalCents)}
      </td>

      <td
        className="px-4 py-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        <StatusSelect
          value={inv.status}
          onChange={(s) => onStatusChange(inv.id, s)}
        />
      </td>

      <td
        className="px-4 py-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        <Button variant="secondary" size="sm" onClick={() => onToggleArchive(inv)}>
          {inv.archivedAt ? 'Désarchiver' : 'Archiver'}
        </Button>
      </td>
    </tr>
  );
}
