import type { ConnectionState, UseGrpcStreamResult } from './useGrpcStream';

export interface UseConnectionStatusResult {
    status: ConnectionState;
    lastError: string | null;
    reconnectAttempt: number;
}

export function useConnectionStatus(stream: UseGrpcStreamResult): UseConnectionStatusResult {
    return {
        status: stream.state,
        lastError: stream.lastError,
        reconnectAttempt: stream.reconnectAttempt,
    };
}

export type { ConnectionState, UseGrpcStreamResult };
