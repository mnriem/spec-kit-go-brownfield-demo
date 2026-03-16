import React, { useEffect, useState } from 'react';
import type { ConnectionState } from '../hooks/useConnectionStatus';

interface StatusBannerProps {
    status: ConnectionState;
    lastError: string | null;
    reconnectAttempt: number;
    onReconnect?: () => void;
}

export function StatusBanner({ status, lastError, reconnectAttempt, onReconnect }: StatusBannerProps) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (status === 'connected') {
            const timer = setTimeout(() => setVisible(false), 3000);
            return () => clearTimeout(timer);
        }
        setVisible(true);
    }, [status]);

    if (!visible && status === 'connected') {
        return null;
    }

    let className = 'status-banner';
    let message = '';

    switch (status) {
        case 'connected':
            className += ' status-connected';
            message = '● Connected';
            break;
        case 'connecting':
            className += ' status-connecting';
            message = '○ Connecting...';
            break;
        case 'reconnecting':
            className += ' status-reconnecting';
            message = `○ Reconnecting... (attempt ${reconnectAttempt})`;
            break;
        case 'disconnected':
            className += ' status-disconnected';
            message = '● Disconnected — Backend unreachable';
            break;
    }

    return (
        <div className={className}>
            <span>{message}</span>
            {lastError && <span className="status-error">{lastError}</span>}
            {status === 'disconnected' && onReconnect && (
                <button className="status-reconnect-btn" onClick={onReconnect}>
                    Reconnect
                </button>
            )}
        </div>
    );
}
