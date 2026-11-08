// Edge Function: отправляет push-уведомления по напоминаниям, у которых наступило время.
// Секреты (Edge Functions → Secrets): VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT (mailto:вы@почта), CRON_SECRET.
// В настройках функции отключите "Verify JWT" — доступ защищён заголовком x-cron-secret.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT")!, Deno.env.get("VAPID_PUBLIC")!, Deno.env.get("VAPID_PRIVATE")!);

  const now = new Date().toISOString();
  const since = new Date(Date.now() - 12 * 3600e3).toISOString();
  const { data: due } = await sb.from("reminders").select("*")
    .eq("sent", false).lte("fire_at", now).gte("fire_at", since).limit(200);

  let sent = 0;
  for (const r of due ?? []) {
    const { data: subs } = await sb.from("push_subs").select("endpoint,sub").eq("user_id", r.user_id);
    const payload = JSON.stringify({ title: r.title, body: r.body ?? "", url: "./" });
    for (const s of subs ?? []) {
      try { await webpush.sendNotification(s.sub, payload); sent++; }
      catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) await sb.from("push_subs").delete().eq("endpoint", s.endpoint);
      }
    }
    await sb.from("reminders").update({ sent: true }).eq("user_id", r.user_id).eq("id", r.id);
  }
  return new Response(JSON.stringify({ due: due?.length ?? 0, sent }), { headers: { "Content-Type": "application/json" } });
});
