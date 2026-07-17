"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Loader } from "@/components/ui/Loader";
import { ReportView } from "@/components/report/ReportView";
import { api, getToken, type Report } from "@/lib/api";

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api.me().then((u) => setUserName(u.name)).catch(() => {});
    api.report(id)
      .then(setReport)
      .catch(() => setError("We couldn't load this report."))
      .finally(() => setLoading(false));
  }, [id, router]);

  return (
    <AppShell bleed>
      <div className="rpv-stage">
        {loading ? (
          <Loader label="Loading your report…" />
        ) : error || !report ? (
          <div className="rpl-empty">
            <div className="em">🔌</div>
            <h3>Report unavailable</h3>
            <p>{error || "This report doesn't exist yet."}</p>
            <Link href="/reports" className="btn" style={{ marginTop: 16 }}>← Back to reports</Link>
          </div>
        ) : (
          <ReportView report={report} userName={userName} />
        )}
      </div>
    </AppShell>
  );
}
