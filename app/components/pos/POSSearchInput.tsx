"use client";

import { useState, useEffect, useCallback, useRef, memo, useImperativeHandle, forwardRef } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export type SearchMode = 'all' | 'name' | 'code' | 'barcode';

export interface POSSearchInputRef {
  clearSearch: () => void;
  focus: () => void;
}

interface POSSearchInputProps {
  onSearch: (query: string) => void;
  searchMode: SearchMode;
  onSearchModeChange: (mode: SearchMode) => void;
  debounceMs?: number;
  className?: string;
  placeholder?: string;
  isMobile?: boolean;
}

const POSSearchInput = memo(forwardRef<POSSearchInputRef, POSSearchInputProps>(function POSSearchInput({
  onSearch,
  searchMode,
  onSearchModeChange,
  debounceMs = 400,
  className,
  placeholder,
  isMobile = false,
}, ref) {
  const [localValue, setLocalValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    clearSearch: () => {
      setLocalValue('');
    },
    focus: () => {
      inputRef.current?.focus();
    }
  }), []);

  // Debounced search - sends to parent only after typing stops
  useEffect(() => {
    const timer = setTimeout(() => onSearch(localValue), debounceMs);
    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onSearch]);

  // Navigate between search modes with arrow keys
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const modes: SearchMode[] = ['all', 'name', 'code', 'barcode'];
    const currentIndex = modes.indexOf(searchMode);

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIndex = currentIndex === 0 ? modes.length - 1 : currentIndex - 1;
      onSearchModeChange(modes[newIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIndex = (currentIndex + 1) % modes.length;
      onSearchModeChange(modes[newIndex]);
    }
  }, [searchMode, onSearchModeChange]);

  const getModeLabel = () => {
    switch (searchMode) {
      case 'all': return '*';
      case 'name': return 'اسم';
      case 'code': return 'كود';
      case 'barcode': return 'باركود';
    }
  };

  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    if (isMobile) {
      switch (searchMode) {
        case 'all': return 'بحث...';
        case 'name': return 'بحث بالاسم...';
        case 'code': return 'بحث بالكود...';
        case 'barcode': return 'الباركود...';
      }
    }
    switch (searchMode) {
      case 'all': return 'بحث بالاسم أو الكود أو الباركود...';
      case 'name': return 'بحث بالاسم...';
      case 'code': return 'بحث بالكود...';
      case 'barcode': return 'ضع الباركود هنا...';
    }
  };

  const handleModeClick = useCallback(() => {
    const modes: SearchMode[] = ['all', 'name', 'code', 'barcode'];
    const currentIndex = modes.indexOf(searchMode);
    const newIndex = (currentIndex + 1) % modes.length;
    onSearchModeChange(modes[newIndex]);
  }, [searchMode, onSearchModeChange]);

  return (
    <div className={`relative ${className || 'w-72'}`}>
      <div
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-blue-600 px-2 py-0.5 rounded text-xs text-white font-medium z-10 select-none cursor-pointer"
        onClick={handleModeClick}
      >
        {getModeLabel()}
      </div>
      <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--dash-text-muted)]" />
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={getPlaceholder()}
        className={isMobile
          ? "w-full pl-16 pr-10 py-2 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded-md text-[var(--dash-text-primary)] placeholder-[var(--dash-text-disabled)] focus:outline-none focus:ring-2 focus:ring-[var(--dash-accent-blue)] focus:border-transparent"
          : "w-full pl-16 pr-10 py-2 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded-lg text-[var(--dash-text-primary)] placeholder-[var(--dash-text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        }
        style={isMobile ? { fontSize: "16px" } : undefined}
      />
    </div>
  );
}));

export default POSSearchInput;
