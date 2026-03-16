import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TimeFormat } from '@gov.nasa.jpl.hermes/types';
import { useStream } from '../App';
import { FilterBar, type FilterState } from '../components/FilterBar';
import { TimeFormatSelector } from '../components/TimeFormatSelector';
import { EmptyState } from '../components/EmptyState';

interface TelemetryChannel {
    source: string;
    name: string;
    rawId: string;
    value: unknown;
    timeUtc: number;
    timeSclk: number;
    component: string;
}

interface DictEntry {
    id: string;
    name: string;
    component: string;
}

function formatTime(utc: number, sclk: number, format: TimeFormat): string {
    switch (format) {
        case TimeFormat.UTC:
            return new Date(utc).toISOString();
        case TimeFormat.LOCAL:
            return new Date(utc).toLocaleString();
        case TimeFormat.SCLK:
            return sclk.toFixed(4);
    }
}

function formatValue(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'number') {
        return Number.isInteger(value) ? value.toString() : value.toFixed(4);
    }
    return String(value);
}

export function TelemetryView() {
    const stream = useStream();
    const [channels, setChannels] = useState<Map<string, TelemetryChannel>>(new Map());
    const [dictLookup, setDictLookup] = useState<Map<string, DictEntry>>(new Map());
    const [timeFormat, setTimeFormat] = useState<TimeFormat>(TimeFormat.UTC);
    const [filter, setFilter] = useState<FilterState>({ text: '', sources: [], severities: [] });
    const batchRef = useRef<Map<string, TelemetryChannel>>(new Map());
    const timerRef = useRef<number | null>(null);

    // Handle incoming telemetry — batch into 100ms render cycles
    const handleTelemetry = useCallback((data: unknown) => {
        const msg = data as {
            source?: string;
            telemetry?: {
                ref?: { id?: string; name?: string; component?: string };
                time?: { utc?: number; sclk?: number };
                value?: unknown;
            };
        };

        if (!msg?.telemetry) return;

        const ref = msg.telemetry.ref;
        const time = msg.telemetry.time;
        const source = msg.source ?? '';
        const name = ref?.name ?? ref?.id ?? 'unknown';
        const key = `${source}:${name}`;

        batchRef.current.set(key, {
            source,
            name,
            rawId: ref?.id ?? '',
            value: msg.telemetry.value,
            timeUtc: time?.utc ?? 0,
            timeSclk: time?.sclk ?? 0,
            component: ref?.component ?? '',
        });

        if (!timerRef.current) {
            timerRef.current = window.setTimeout(() => {
                timerRef.current = null;
                setChannels((prev) => {
                    const next = new Map(prev);
                    for (const [k, v] of batchRef.current) {
                        next.set(k, v);
                    }
                    batchRef.current.clear();
                    return next;
                });
            }, 100);
        }
    }, []);

    const handleDictionaries = useCallback((data: unknown) => {
        const dicts = data as Array<{ id?: string }>;
        if (!Array.isArray(dicts)) return;
        for (const d of dicts) {
            if (d.id) {
                stream.send({ type: 'get_dictionary', data: { id: d.id } });
            }
        }
    }, [stream]);

    const handleDictionary = useCallback((data: unknown) => {
        const dict = data as {
            telemetry?: Array<{ id?: string; name?: string; component?: string }>;
        };
        if (!dict?.telemetry) return;
        setDictLookup((prev) => {
            const next = new Map(prev);
            for (const t of dict.telemetry!) {
                if (t.id) {
                    next.set(t.id, { id: t.id, name: t.name ?? t.id, component: t.component ?? '' });
                }
            }
            return next;
        });
    }, []);

    // Register message handlers
    useEffect(() => {
        stream.on('telemetry', handleTelemetry);
        stream.on('dictionaries', handleDictionaries);
        stream.on('dictionary', handleDictionary);
        return () => {
            stream.off('telemetry', handleTelemetry);
            stream.off('dictionaries', handleDictionaries);
            stream.off('dictionary', handleDictionary);
        };
    }, [stream, handleTelemetry, handleDictionaries, handleDictionary]);

    // Subscribe on connect
    useEffect(() => {
        if (stream.state !== 'connected') return;
        stream.subscribe('telemetry', {});
        stream.subscribe('fsw', {});
        stream.send({ type: 'get_dictionaries' });
        return () => { stream.unsubscribe('telemetry'); };
    }, [stream.state]);

    // Resolve names through dictionary
    const resolvedChannels = useMemo(() => {
        const result: TelemetryChannel[] = [];
        for (const ch of channels.values()) {
            const dictEntry = dictLookup.get(ch.rawId);
            result.push({
                ...ch,
                name: dictEntry?.name ?? ch.name,
                component: dictEntry?.component ?? ch.component,
            });
        }
        return result;
    }, [channels, dictLookup]);

    const sources = useMemo(() => {
        const srcs = new Set<string>();
        for (const ch of resolvedChannels) srcs.add(ch.source);
        return Array.from(srcs).sort();
    }, [resolvedChannels]);

    const filteredChannels = useMemo(() => {
        let result = resolvedChannels;

        if (filter.sources.length > 0) {
            const srcSet = new Set(filter.sources);
            result = result.filter((ch) => srcSet.has(ch.source));
        }

        if (filter.text) {
            const lower = filter.text.toLowerCase();
            result = result.filter((ch) => ch.name.toLowerCase().includes(lower));
        }

        result.sort((a, b) => {
            const srcCmp = a.source.localeCompare(b.source);
            return srcCmp !== 0 ? srcCmp : a.name.localeCompare(b.name);
        });

        return result;
    }, [resolvedChannels, filter]);

    if (stream.state !== 'connected' && channels.size === 0) {
        return (
            <EmptyState
                title="Waiting for connection"
                message="Connecting to Hermes backend..."
            />
        );
    }

    if (channels.size === 0) {
        return (
            <EmptyState
                title="No telemetry data"
                message="Waiting for telemetry from connected flight software..."
            />
        );
    }

    return (
        <>
            <div className="view-toolbar">
                <TimeFormatSelector value={timeFormat} onChange={setTimeFormat} />
                <FilterBar sources={sources} onFilterChange={setFilter} />
            </div>
            <div className="scroll-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: '12%' }}>Source</th>
                            <th style={{ width: '20%' }}>Channel</th>
                            <th style={{ width: '15%' }}>Value</th>
                            <th style={{ width: '20%' }}>Time</th>
                            <th style={{ width: '15%' }}>Component</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredChannels.map((ch) => (
                            <tr key={`${ch.source}:${ch.name}`}>
                                <td>{ch.source}</td>
                                <td title={ch.rawId}>{ch.name}</td>
                                <td>{formatValue(ch.value)}</td>
                                <td>{formatTime(ch.timeUtc, ch.timeSclk, timeFormat)}</td>
                                <td>{ch.component}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
