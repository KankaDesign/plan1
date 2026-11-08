-- Запускает отправку напоминаний каждую минуту.
-- Перед запуском замените ТВОЙ_СЕКРЕТ на ту же строку, что указана в секретах функции (CRON_SECRET).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'squirrel-reminders',
  '* * * * *',
  $$ select net.http_post(
       url := 'https://xxerdueuujjhdnnnsjqy.supabase.co/functions/v1/send-reminders',
       headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','ТВОЙ_СЕКРЕТ'),
       body := '{}'::jsonb
     ) $$
);
-- Остановить: select cron.unschedule('squirrel-reminders');
