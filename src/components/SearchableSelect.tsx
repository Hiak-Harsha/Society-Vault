'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Option {
  value: string;
  label: string;
  subtitle?: string;
}

interface SearchableSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  multiple?: boolean;
  maxSelections?: number;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  selected,
  onChange,
  placeholder = 'Select options...',
  multiple = false,
  maxSelections,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (option.subtitle && option.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelect = (option: Option) => {
    if (multiple) {
      if (selected.includes(option.value)) {
        onChange(selected.filter(v => v !== option.value));
      } else {
        if (maxSelections && selected.length >= maxSelections) return;
        onChange([...selected, option.value]);
      }
    } else {
      onChange([option.value]);
      setIsOpen(false);
    }
  };

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter(v => v !== value));
  };

  const selectedOptions = options.filter(opt => selected.includes(opt.value));

  return (
    <div className="searchable-select" ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div 
        className="input select" 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          minHeight: '42px',
          height: 'auto',
          padding: '6px 12px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          paddingRight: '30px',
          position: 'relative'
        }}
      >
        {selectedOptions.length === 0 && (
          <span style={{ color: 'var(--text-muted)' }}>{placeholder}</span>
        )}

        {selectedOptions.map(opt => (
          <span 
            key={opt.value} 
            className="badge badge-neutral" 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 8px',
              fontSize: '13px'
            }}
          >
            {opt.label}
            <button 
              onClick={(e) => handleRemove(opt.value, e)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-danger)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </span>
        ))}

        <span style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text-muted)',
          pointerEvents: 'none'
        }}>
          ▼
        </span>
      </div>

      {isOpen && (
        <div 
          className="glass-card" 
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 100,
            padding: '8px',
            maxHeight: '260px',
            overflowY: 'auto',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)'
          }}
        >
          <input
            type="text"
            className="input search-input"
            placeholder="Type to filter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            style={{ marginBottom: '8px', fontSize: '13px', padding: '8px' }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => {
                const isSelected = selected.includes(option.value);
                return (
                  <div
                    key={option.value}
                    onClick={() => handleSelect(option)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                      color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{ fontWeight: '500', fontSize: '14px' }}>{option.label}</span>
                    {option.subtitle && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {option.subtitle}
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <span style={{ padding: '8px', textAlign: 'center', display: 'block', color: 'var(--text-muted)', fontSize: '13px' }}>
                No options found
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
