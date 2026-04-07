import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import { useAuthContext } from "@/context/AuthContext";
import { useNotificationContext } from "@/context/NotificationContext";
import { NotificationMessage } from "@/types/notification";

// Native WebSocket URL — resolves to ws://host/ws in the browser
const WS_URL = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`;
const TOPIC = "/topic/notifications";

export function useWebSocket() {
  const { token } = useAuthContext();
  const { addNotification } = useNotificationContext();
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    // Only connect when authenticated
    if (!token) {
      clientRef.current?.deactivate();
      clientRef.current = null;
      return;
    }

    const client = new Client({
      brokerURL: WS_URL,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(TOPIC, (frame) => {
          try {
            const msg: NotificationMessage = JSON.parse(frame.body);
            addNotification(msg);
          } catch (e) {
            console.error("Failed to parse WebSocket notification", e);
          }
        });
      },
      onStompError: (frame) => {
        console.error("STOMP error", frame);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
    };
  }, [token, addNotification]);
}
