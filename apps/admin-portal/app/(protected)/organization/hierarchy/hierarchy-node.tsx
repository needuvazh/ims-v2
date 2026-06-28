'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Building2, MapPin, Layers, Home } from 'lucide-react';
import { Badge } from '@ims/shared-ui';
import type { OrganizationHierarchyNode } from '@ims/organization';

export function HierarchyNode({ node, depth = 0 }: { node: OrganizationHierarchyNode; depth?: number }) {
  const [collapsed, setCollapsed] = useState(false);

  const getIcon = () => {
    switch (node.type) {
      case 'Institute':
        return <Building2 className="h-4.5 w-4.5 text-[color:var(--ims-brass)]" />;
      case 'Branch':
        return <MapPin className="h-4 w-4 text-emerald-600" />;
      case 'Department':
        return <Layers className="h-4 w-4 text-brand-600" />;
      case 'Classroom':
        return <Home className="h-4 w-4 text-accent-700" />;
    }
  };

  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg hover:bg-[color:var(--ims-accent-soft)] transition-colors">
        {hasChildren ? (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-0.5 rounded hover:bg-[color:var(--ims-border)] text-[color:var(--ims-muted)]"
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-4.5" />
        )}

        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-[color:var(--ims-surface)] shadow-sm">
          {getIcon()}
        </span>

        <span className="text-sm font-semibold text-[color:var(--ims-ink)]">{node.name}</span>

        {node.code && (
          <span className="text-xs font-mono bg-[color:var(--ims-accent-soft)] px-1.5 py-0.5 rounded text-[color:var(--ims-muted)] border border-[color:var(--ims-border)]">
            {node.code}
          </span>
        )}

        <Badge variant={node.status === 'Active' ? 'success' : 'muted'}>
          {node.status}
        </Badge>
      </div>

      {hasChildren && !collapsed && (
        <div className="pl-6 border-l border-dashed border-[color:var(--ims-border)] ml-3.5 space-y-1">
          {node.children!.map((child) => (
            <HierarchyNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
