import React, { useCallback, useEffect, useState } from 'react';
import { useStream } from '../App';
import { EmptyState } from '../components/EmptyState';

interface FswConnection {
    id: string;
    type: string;
    profileId: string;
    capabilities: string[];
    forwards: string[];
    status: 'connected' | 'disconnected';
}

export function ConnectionsView() {
    const stream = useStream();
    const [connections, setConnections] = useState<FswConnection[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const handleFswList = useCallback((data: unknown) => {
        const list = data as Array<{
            id?: string;
            type?: string;
            profileId?: string;
            profile_id?: string;
            capabilities?: string[];
            forwards?: string[];
        }>;

        if (!Array.isArray(list)) return;

        const activeIds = new Set(list.map((f) => f.id));

        setConnections((prev) => {
            const prevMap = new Map(prev.map((c) => [c.id, c]));

            const next: FswConnection[] = list.map((f) => ({
                id: f.id ?? '',
                type: f.type ?? '',
                profileId: f.profileId ?? f.profile_id ?? '',
                capabilities: f.capabilities ?? [],
                forwards: f.forwards ?? [],
                status: 'connected' as const,
            }));

            for (const p of prevMap.values()) {
                if (!activeIds.has(p.id)) {
                    next.push({ ...p, status: 'disconnected' });
                }
            }

            return next;
        });
    }, []);

    // Register handler
    useEffect(() => {
        stream.on('fsw_list', handleFswList);
        return () => { stream.off('fsw_list', handleFswList); };
    }, [stream, handleFswList]);

    // Subscribe on connect
    useEffect(() => {
        if (stream.state !== 'connected') return;
        stream.subscribe('fsw', {});
        return () => { stream.unsubscribe('fsw'); };
    }, [stream.state]);

    const toggleExpand = useCallback((id: string) => {
        setExpandedId((prev) => (prev === id ? null : id));
    }, []);

    if (connections.length === 0) {
        return (
            <EmptyState
                title="No flight software connections"
                message="No active connections detected. Ensure a Hermes backend with active flight software connections is running."
            />
        );
    }

    return (
        <div className="connection-list">
            {connections.map((conn) => (
                <div
                    key={conn.id}
                    className="connection-card"
                    onClick={() => toggleExpand(conn.id)}
                >
                    <div className="connection-card-header">
                        <span className="connection-card-name">{conn.id}</span>
                        <span className={`connection-badge ${conn.status}`}>
                            {conn.status === 'connected' ? '● Connected' : '○ Disconnected'}
                        </span>
                    </div>
                    <div className="connection-card-meta">
                        Type: {conn.type} · Profile: {conn.profileId || '—'}
                    </div>

                    {expandedId === conn.id && (
                        <div className="connection-details">
                            <div><strong>Capabilities:</strong> {conn.capabilities.length > 0 ? conn.capabilities.join(', ') : 'None'}</div>
                            {conn.forwards.length > 0 && (
                                <div><strong>Forwards:</strong> {conn.forwards.join(', ')}</div>
                            )}
                            <div><strong>Profile ID:</strong> {conn.profileId || 'N/A'}</div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
