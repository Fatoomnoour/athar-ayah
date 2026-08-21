import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { SURAH_LIST } from '../../utils/quranUtils';

interface SurahSearchSelectProps {
  value: number;
  onChange: (surahId: number, surahName: string) => void;
  className?: string;
}

export default function SurahSearchSelect({ value, onChange, className = '' }: SurahSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  const selectedSurah = SURAH_LIST.find(s => s.id === value) || SURAH_LIST[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSurahs = SURAH_LIST.filter(surah => 
    surah.name.includes(searchTerm) || 
    surah.id.toString() === searchTerm
  );

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm flex items-center justify-between ${className}`}
      >
        <span>{selectedSurah.id}. سورة {selectedSurah.name}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50 dark:bg-slate-950">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث باسم السورة أو رقمها..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredSurahs.length > 0 ? (
              filteredSurahs.map((surah) => (
                <button
                  key={surah.id}
                  type="button"
                  onClick={() => {
                    onChange(surah.id, surah.name);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full text-right px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                    value === surah.id ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-bold' : ''
                  }`}
                >
                  {surah.id}. سورة {surah.name}
                  <span className="text-xs text-slate-400 mr-2">({surah.verses} آية)</span>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-slate-500">لا توجد سورة بهذا الاسم</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
