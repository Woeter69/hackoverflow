type WebSocketListener = (data: any) => void;

class WebSocketService {
    private socket: WebSocket | null = null;
    private listeners: Record<string, WebSocketListener[]> = {};
    private urlBase: string;

    constructor() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        this.urlBase = `${protocol}//${host}/ws`;
    }

    connect(userId?: string) {
        if (this.socket) return;

        const url = userId ? `${this.urlBase}?userId=${userId}` : this.urlBase;
        this.socket = new WebSocket(url);

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
