import { redirect } from "next/navigation";

// /demo → the dashboard (the tour starts there). Keep the query (?ref=portfolio …) for visit tracking.
export default async function DemoEntry({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") qs.set(k, v);
  }
  const q = qs.toString();
  redirect(`/demo/dashboard${q ? `?${q}` : ""}`);
}
