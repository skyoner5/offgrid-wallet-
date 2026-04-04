// Web Bluetooth API — works on Android Chrome + Desktop Chrome
// NOT supported on iOS Safari

const SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb";
const TX_CHAR_UUID = "0000fff1-0000-1000-8000-00805f9b34fb";

export function bluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

// ─── Send side: advertise and send signed tx over BLE ─────────────────────────

export async function sendViaBluetooth(encodedPayload: string): Promise<void> {
  if (!bluetoothSupported()) throw new Error("Web Bluetooth not supported on this browser");

  // @ts-ignore — Web Bluetooth types incomplete
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [SERVICE_UUID] }],
    optionalServices: [SERVICE_UUID],
  });

  // @ts-ignore
  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(SERVICE_UUID);
  const characteristic = await service.getCharacteristic(TX_CHAR_UUID);

  // Split into 512-byte chunks (BLE MTU limit)
  const encoder = new TextEncoder();
  const bytes = encoder.encode(encodedPayload);
  const CHUNK = 512;

  for (let i = 0; i < bytes.length; i += CHUNK) {
    const chunk = bytes.slice(i, i + CHUNK);
    await characteristic.writeValueWithResponse(chunk);
  }

  server.disconnect();
}

// ─── Receive side: listen for incoming BLE tx ─────────────────────────────────

export async function receiveViaBluetooth(
  onReceive: (payload: string) => void
): Promise<() => void> {
  if (!bluetoothSupported()) throw new Error("Web Bluetooth not supported");

  // @ts-ignore
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [SERVICE_UUID],
  });

  // @ts-ignore
  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(SERVICE_UUID);
  const characteristic = await service.getCharacteristic(TX_CHAR_UUID);

  let buffer = "";
  const decoder = new TextDecoder();

  await characteristic.startNotifications();

  const handler = (event: Event) => {
    // @ts-ignore
    const chunk = decoder.decode(event.target.value);
    buffer += chunk;
    // Simple delimiter — full JSON ends with }
    try {
      JSON.parse(buffer);
      onReceive(buffer);
      buffer = "";
    } catch {
      // still accumulating chunks
    }
  };

  characteristic.addEventListener("characteristicvaluechanged", handler);

  // Return cleanup fn
  return () => {
    characteristic.removeEventListener("characteristicvaluechanged", handler);
    server.disconnect();
  };
}
