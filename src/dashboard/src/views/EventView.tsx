import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TimeFormat, EvrSeverity } from '@gov.nasa.jpl.hermes/types';
import { useStream } from '../App';
import { FilterBar, type FilterState } from '../components/FilterBar';
import { TimeFormatSelector } from '../components/TimeFormatSelector';
import { EmptyState } from '../components/EmptyState';

interface DisplayEvent {
    index: number;
    source: string;
    name: string;
    component: string;
    severity: string;
    message: string;
    timeUtc: number;
    timeSclk: number;
}

const ALL_SEVERITIES = [
    EvrSeverity.diagnostic,
    EvrSeverity.activityLow,
    EvrSeverity.activityHigh,
    EvrSeverity.warningLow,
    EvrSeverity.warningHigh,
    EvrSeverity.command,
    EvrSeverity.fatal,
];

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

export function EventView() {
    const stream = useStream();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [events, setEvents] = useState<DisplayEvent[]>([]);
    const [autoscroll, setAutoscroll] = useState(true);
    const [timeFormat, setTimeFormat] = useState<TimeFormat>(TimeFormat.UTC);
    const [filter, setFilter] = useState<FilterState>({ text: '', sources: [], severities: [] });

    const handleEvent = useCallback((data: unknown) => {
        const msg = data as {
            source?: string;
            event?: {
                ref?: { name?: string; component?: string; severity?: string };
                time?: { utc?: number; sclk?: number };
                message?: string;
            };
        };

        if (!msg?.event) return;

        const ref = msg.event.ref;
        const time = msg.event.time;

        setEvents((prev) => {
            const evt: DisplayEvent = {
                index: prev.length,
                source: msg.source ?? '',
                name: ref?.name ?? '',
                component: ref?.component ?? '',
                severity: ref?.severity ?? 'DIAGNOSTIC',
                message: msg.event!.message ?? '',
                timeUtc: time?.utc ?? 0,
                timeSclk: time?.sclk ?? 0,
            };
            return [...prev, evt];
        });
    }, []);

    // Register handler
    useEffect(() => {
        stream.on('event', handleEvent);
        return () => { stream.off('event', handleEvent); };
    }, [stream, handleEvent]);

    // Subscribe on connect
    useEffect(() => {
        if (stream.state !== 'connected') return;
        stream.subscribe('events', {});
        return () => { stream.unsubscribe('events'); };
    }, [stream.state]);

    const sources = useMemo(() => {
        const srcs = new Set<string>();
        for (const e of events) srcs.add(e.source);
        return Array.from(srcs).sort();
    }, [events]);

    const filteredEvents = useMemo(() => {
        let result = events;

        if (filter.sources.length > 0) {
            const srcSet = new Set(filter.sources);
            result = result.filter((e) => srcSet.has(e.source));
        }

        if (filter.severities.length > 0) {
            const sevSet = new Set(filter.severities);
            result = result.filter((e) => sevSet.has(e.severity));
        }

        if (filter.text) {
            const lower = filter.text.toLowerCase();
            result = result.filter((e) => e.message.toLowerCase().includes(lower));
        }

        return result;
    }, [events, filter]);

    const virtualizer = useVirtualizer({
        count: filteredEvents.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 28,
        overscan: 20,
    });

    // Auto-scroll to bottom
    useEffect(() => {
        if (autoscroll && filteredEvents.length > 0) {
            requestAnimationFrame(() => {
                virtualizer.scrollToOffset(virtualizer.getTotalSize());
            });
        }
    }, [filteredEvents.length, autoscroll]);

    if (events.length === 0) {
        return (
            <EmptyState
                title="No events received"
                message="Waiting for event records from connected flight software..."
            />
        );
    }

    return (
        <>
            <div className="view-toolbar">
                <TimeFormatSelector value={timeFormat} onChange={setTimeFormat} />
                <FilterBar
                    sources={sources}
                    severities={ALL_SEVERITIES}
                    onFilterChange={setFilter}
                />
                <label className="follow-checkbox">
                    <input
                        type="checkbox"
                        checked={autoscroll}
                        onChange={(e) => setAutoscroll(e.target.checked)}
                    />
                    Follow
                </label>
            </div>
            <div ref={scrollRef} className="scroll-container">
                <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: '5%' }}>#</th>
                                <th style={{ width: '18%' }}>Time</th>
                                <th style={{ width: '10%' }}>Severity</th>
                                <th style={{ width: '10%' }}>Component</th>
                                <th style={{ width: '12%' }}>Name</th>
                                <th style={{ width: '35%' }}>Message</th>
                                <th style={{ width: '10%' }}>Source</th>
                            </tr>
                        </thead>
                        <tbody>
                            {virtualizer.getVirtualItems().map((virtualRow) => {
                                const evt = filteredEvents[virtualRow.index];
                                return (
                                    <tr
                                        key={virtualRow.index}
                                        className={evt.severity}
                                        style={{
                                            height: `${virtualRow.size}px`,
                                            transform: `translateY(${virtualRow.start}px)`,
                                            position: 'absolute',
                                            width: '100%',
                                            display: 'table-row',
                                        }}
                                    >
                                        <td>{evt.index + 1}</td>
                                        <td>{formatTime(evt.timeUtc, evt.timeSclk, timeFormat)}</td>
                                        <td>{evt.severity}</td>
                                        <td>{evt.component}</td>
                                        <td>{evt.name}</td>
                                        <td title={evt.message}>{evt.message}</td>
                                        <td>{evt.source}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
