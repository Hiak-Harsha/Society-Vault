'use client';

import React, { useState, useMemo } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
}

// Recursive helper to search nested objects safely and accurately
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function matchValue(val: any, query: string): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'object') {
    return Object.values(val).some(nestedVal => matchValue(nestedVal, query));
  }
  return String(val).toLowerCase().includes(query);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data available',
  searchable = false,
  searchPlaceholder = 'Search...',
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = React.useDeferredValue(searchQuery);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const processedData = useMemo(() => {
    let result = [...data];

    // Search filtering
    if (searchable && deferredSearchQuery) {
      const query = deferredSearchQuery.toLowerCase();
      result = result.filter((row) =>
        Object.entries(row).some(([, val]) => matchValue(val, query))
      );
    }

    // Sorting
    if (sortConfig) {
      const { key, direction } = sortConfig;
      result.sort((a, b) => {
        const aValue = a[key];
        const bValue = b[key];

        if (aValue === undefined || aValue === null) return direction === 'asc' ? 1 : -1;
        if (bValue === undefined || bValue === null) return direction === 'asc' ? -1 : 1;

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return direction === 'asc' ? aValue - bValue : bValue - aValue;
        }

        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();

        if (aStr < bStr) return direction === 'asc' ? -1 : 1;
        if (aStr > bStr) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, deferredSearchQuery, sortConfig, searchable]);

  return (
    <div className="data-table-wrapper">
      {searchable && (
        <div className="data-table-header">
          <div className="data-table-search" style={{ position: 'relative', width: '100%' }}>
            <span style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              className="input search-input"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '38px', width: '100%' }}
            />
          </div>
        </div>
      )}

      <div className="data-table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                  className={column.sortable !== false ? 'sortable' : ''}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {column.label}
                    {column.sortable !== false && (
                      <span className={`sort-indicator ${sortConfig?.key === column.key ? 'sort-active' : ''}`}>
                        {sortConfig?.key === column.key && sortConfig.direction === 'desc' ? '▼' : '▲'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processedData.length > 0 ? (
              processedData.map((row, rowIndex) => (
                <tr
                  key={row.id || rowIndex}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={onRowClick ? 'clickable' : ''}
                >
                  {columns.map((column) => {
                    const cellValue = row[column.key];
                    return (
                      <td key={column.key}>
                        {column.render ? column.render(cellValue, row) : cellValue}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="data-table-empty">
                  <div className="data-table-empty-text">{emptyMessage}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
