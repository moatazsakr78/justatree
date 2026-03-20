'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

interface Option {
  value: string
  label: string
  icon?: string
}

interface SearchableSelectProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  searchPlaceholder?: string
  className?: string
  name?: string
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder = "بحث...",
  className = "",
  name
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredOptions, setFilteredOptions] = useState(options)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Filter options based on search term
  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase().trim())
      )
      setFilteredOptions(filtered)
    } else {
      setFilteredOptions(options)
    }
  }, [searchTerm, options])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  const selectedOption = options.find(option => option.value === value)

  const handleToggle = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setSearchTerm('')
    }
  }

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
    setSearchTerm('')
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Hidden input for form submission */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={value}
        />
      )}
      
      {/* Main button */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full px-3 py-2 bg-[var(--dash-input-bg)] border border-[var(--dash-border-default)] rounded-dash-sm text-[var(--dash-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--dash-accent-blue)] focus:border-transparent text-right text-sm flex items-center justify-between transition-colors"
      >
        <ChevronDownIcon 
          className={`h-4 w-4 text-[var(--dash-text-muted)] transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
        
        <div className="flex items-center gap-2">
          {selectedOption ? (
            <>
              <span>{selectedOption.label}</span>
              {selectedOption.icon && (
                <div className="w-4 h-4 relative">
                  <Image
                    src={selectedOption.icon}
                    alt={selectedOption.label}
                    fill
                    className="object-contain"
                  />
                </div>
              )}
            </>
          ) : (
            <span className="text-[var(--dash-text-muted)]">{placeholder}</span>
          )}
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded-dash-sm shadow-dash-lg max-h-60 overflow-hidden animate-dash-slide-up">
          {/* Search input */}
          <div className="p-2 border-b border-[var(--dash-border-subtle)]">
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full px-2 py-1 bg-[var(--dash-bg-base)] border border-[var(--dash-border-default)] rounded-dash-sm text-[var(--dash-text-primary)] placeholder-[var(--dash-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--dash-accent-blue)] focus:border-transparent text-right text-sm transition-colors"
            />
          </div>

          {/* Options list */}
          <div className="max-h-44 overflow-y-auto scrollbar-hide">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className="w-full px-3 py-2 text-right text-sm text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)] focus:bg-[var(--dash-bg-overlay)] focus:outline-none flex items-center justify-end gap-2 transition-colors"
                >
                  <span>{option.label}</span>
                  {option.icon && (
                    <div className="w-4 h-4 relative">
                      <Image
                        src={option.icon}
                        alt={option.label}
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-right text-sm text-[var(--dash-text-muted)]">
                لا توجد نتائج
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}