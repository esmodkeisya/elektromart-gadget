import { redirect } from "next/navigation";

// Legacy route kept for compatibility. The real finance dashboard now lives
// at /admin/keuangan and reads live data from /api/finance/admin.
export default function KeuanganSaldoPage() {
  redirect("/admin/keuangan");
}
