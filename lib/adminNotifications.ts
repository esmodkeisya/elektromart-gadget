// Notifikasi admin hanya berasal dari laporan produk yang masih menunggu tinjauan.
// Status "sudah dibuka" disimpan di browser admin agar titik merah hilang setelah
// halaman laporan dibuka, dan muncul lagi saat ada laporan baru yang belum dilihat.

const SEEN_KEY = "elektromart_admin_seen_reports";
const EVENT = "elektromart-admin-notifications-changed";

export function getSeenReportIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function markReportsSeen(ids: string[]) {
  if (typeof window === "undefined" || !ids.length) return;
  const seen = new Set(getSeenReportIds());
  ids.forEach((id) => seen.add(id));
  window.localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeAdminNotifications(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
