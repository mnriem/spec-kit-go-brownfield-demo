import React, { useCallback, useMemo, useRef, useState } from 'react';

export interface FilterState {
    text: string;
    sources: string[];
    severities: string[];
}

interface FilterBarProps {
    sources: string[];
    severities?: string[];
    onFilterChange: (filter: FilterState) => void;
}

export function FilterBar({ sources, severities, onFilterChange }: FilterBarProps) {
    const [text, setText] = useState('');
    const [selectedSources, setSelectedSources] = useState<string[]>([]);
    const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const emitChange = useCallback((update: Partial<FilterState>) => {
        const filter: FilterState = {
            text: update.text ?? text,
            sources: update.sources ?? selectedSources,
            severities: update.severities ?? selectedSeverities,
        };
        onFilterChange(filter);
    }, [text, selectedSources, selectedSeverities, onFilterChange]);

    const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setText(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => emitChange({ text: value }), 150);
    }, [emitChange]);

    const handleSourceToggle = useCallback((source: string) => {
        setSelectedSources((prev) => {
            const next = prev.includes(source)
                ? prev.filter((s) => s !== source)
                : [...prev, source];
            setTimeout(() => emitChange({ sources: next }), 0);
            return next;
        });
    }, [emitChange]);

    const handleSeverityToggle = useCallback((severity: string) => {
        setSelectedSeverities((prev) => {
            const next = prev.includes(severity)
                ? prev.filter((s) => s !== severity)
                : [...prev, severity];
            setTimeout(() => emitChange({ severities: next }), 0);
            return next;
        });
    }, [emitChange]);

    const allSourcesSelected = selectedSources.length === 0;
    const allSeveritiesSelected = selectedSeverities.length === 0;

    return (
        <div className="filter-bar">
            <input
                type="text"
                className="filter-text"
                placeholder="Filter..."
                value={text}
                onChange={handleTextChange}
            />

            {sources.length > 1 && (
                <div className="filter-group">
                    <label>Source:</label>
                    <button
                        className={`filter-chip ${allSourcesSelected ? 'active' : ''}`}
                        onClick={() => {
                            setSelectedSources([]);
                            setTimeout(() => emitChange({ sources: [] }), 0);
                        }}
                    >
                        All
                    </button>
                    {sources.map((s) => (
                        <button
                            key={s}
                            className={`filter-chip ${selectedSources.includes(s) ? 'active' : ''}`}
                            onClick={() => handleSourceToggle(s)}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}

            {severities && severities.length > 0 && (
                <div className="filter-group">
                    <label>Severity:</label>
                    <button
                        className={`filter-chip ${allSeveritiesSelected ? 'active' : ''}`}
                        onClick={() => {
                            setSelectedSeverities([]);
                            setTimeout(() => emitChange({ severities: [] }), 0);
                        }}
                    >
                        All
                    </button>
                    {severities.map((s) => (
                        <button
                            key={s}
                            className={`filter-chip severity-${s.toLowerCase()} ${selectedSeverities.includes(s) ? 'active' : ''}`}
                            onClick={() => handleSeverityToggle(s)}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
