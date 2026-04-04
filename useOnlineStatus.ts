import { useEffect, useState } from "react";
import { broadcastQueue, syncNonceFromChain, getAddress } from "@/lib/wallet";

export function useOnlineStatus() {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);

    const handleOnline = async () => {
      setOnline(true);
      // Sync nonce from chain first
      try {
        const address = getAddress();
        await syncNonceFromChain(address);
      } catch {}
      // Then broadcast any queued txs
      await broadcastQueue();
    };

    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // On mount, if online, try to broadcast
    if (navigator.onLine) {
      handleOnline();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return online;
}
