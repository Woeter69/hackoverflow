type WebSocketListener = (data: any) => void;

class WebSocketService {
    private socket: WebSocket | null = null;
    private listeners: Record<string, WebSocketListener[]> = {};
    private url: string;

    constructor() {
        // Determine WS URL (handles dev proxy vs prod)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host; // e.g. localhost:3000
        // In dev, Vite proxies /api, but usually not /ws unless configured.
        // If we used the Vite proxy for /ws, it would be `ws://${host}/ws`.
        // Let's assume the Vite proxy handles the upgrade.
        this.url = `${protocol}//${host}/ws`;
    }

    connect() {
        if (this.socket) return;

        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
            console.log("WebSocket Connected");
        };

        this.socket.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type && this.listeners[msg.type]) {
                    this.listeners[msg.type].forEach(cb => cb(msg.payload));
                }
            } catch (e) {
                console.error("WS Parse Error", e);
            }
        };

        this.socket.onclose = () => {
            console.log("WebSocket Disconnected. Reconnecting...");
            this.socket = null;
            setTimeout(() => this.connect(), 3000);
        };
    }

    on(type: string, callback: WebSocketListener) {
        if (!this.listeners[type]) {
            this.listeners[type] = [];
        }
        this.listeners[type].push(callback);
    }

    off(type: string, callback: WebSocketListener) {
        if (!this.listeners[type]) return;
        this.listeners[type] = this.listeners[type].filter(cb => cb !== callback);
    }
}

export const wsService = new WebSocketService();
