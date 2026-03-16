import React, { createContext, useCallback, useContext, useState } from 'react';
import { useGrpcStream, type UseGrpcStreamResult } from './hooks/useGrpcStream';
import { useConnectionStatus } from './hooks/useConnectionStatus';
import { StatusBanner } from './components/StatusBanner';
import { TelemetryView } from './views/TelemetryView';
import { EventView } from './views/EventView';
import { ConnectionsView } from './views/ConnectionsView';

type TabId = 'telemetry' | 'events' | 'connections';

const StreamContext = createContext<UseGrpcStreamResult | null>(null);

export function useStream(): UseGrpcStreamResult {
    const ctx = useContext(StreamContext);
    if (!ctx) throw new Error('useStream must be used within App');
    return ctx;
}

export function App() {
    const [activeTab, setActiveTab] = useState<TabId>('telemetry');
    const stream = useGrpcStream();
    const connectionStatus = useConnectionStatus(stream);

    const handleReconnect = useCallback(() => {
        // Force reconnect by reloading the page
        window.location.reload();
    }, []);

    return (
        <StreamContext.Provider value={stream}>
            <div className="dashboard-header">
                <h1>Hermes Dashboard</h1>
            </div>

            <StatusBanner
                status={connectionStatus.status}
                lastError={connectionStatus.lastError}
                reconnectAttempt={connectionStatus.reconnectAttempt}
                onReconnect={handleReconnect}
            />

            <nav className="tab-nav">
                <button
                    className={activeTab === 'telemetry' ? 'active' : ''}
                    onClick={() => setActiveTab('telemetry')}
                >
                    Telemetry
                </button>
                <button
                    className={activeTab === 'events' ? 'active' : ''}
                    onClick={() => setActiveTab('events')}
                >
                    Events
                </button>
                <button
                    className={activeTab === 'connections' ? 'active' : ''}
                    onClick={() => setActiveTab('connections')}
                >
                    Connections
                </button>
            </nav>

            <div className="view-container">
                {activeTab === 'telemetry' && <TelemetryView />}
                {activeTab === 'events' && <EventView />}
                {activeTab === 'connections' && <ConnectionsView />}
            </div>
        </StreamContext.Provider>
    );
}
