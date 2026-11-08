// Squirrel: виджет закреплённой задачи для приложения Scriptable (iPhone / iPad).
// Показывает одну задачу, у которой в Squirrel включено «Закрепить на виджете».
// Отметили задачу выполненной — виджет становится пустым, пока не закрепите новую.

const SUPABASE_URL = 'https://xxerdueuujjhdnnnsjqy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_781NXZH7stAFq6jGDh7Hrw_yvD7myJQ';
const APP_URL = 'https://ВАШ-НИК.github.io/ВАШ-РЕПОЗИТОРИЙ/'; // адрес вашего Squirrel на GitHub Pages
const KC = 'squirrel-login';
const CACHE = 'squirrel-widget-cache.json';

async function creds() {
  if (Keychain.contains(KC)) return JSON.parse(Keychain.get(KC));
  const a = new Alert();
  a.title = 'Squirrel';
  a.message = 'Введите почту и пароль от аккаунта Squirrel. Они хранятся только в защищённом хранилище Scriptable на этом устройстве.';
  a.addTextField('Почта');
  a.addSecureTextField('Пароль');
  a.addAction('Сохранить');
  a.addCancelAction('Отмена');
  const r = await a.presentAlert();
  if (r < 0) throw new Error('Вход отменён');
  const c = { email: a.textFieldValue(0).trim(), password: a.textFieldValue(1) };
  Keychain.set(KC, JSON.stringify(c));
  return c;
}

async function login() {
  const c = await creds();
  const r = new Request(SUPABASE_URL + '/auth/v1/token?grant_type=password');
  r.method = 'POST';
  r.headers = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };
  r.body = JSON.stringify(c);
  const j = await r.loadJSON();
  if (!j.access_token) { Keychain.remove(KC); throw new Error('Не удалось войти. Запустите скрипт заново и введите данные.'); }
  return j;
}

async function loadPinned() {
  const fm = FileManager.local();
  const path = fm.joinPath(fm.documentsDirectory(), CACHE);
  try {
    const a = await login();
    const r = new Request(SUPABASE_URL + '/rest/v1/planner_state?select=tasks:data->tasks&user_id=eq.' + a.user.id);
    r.headers = { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + a.access_token };
    const rows = await r.loadJSON();
    const tasks = (rows[0] && rows[0].tasks) || {};
    let best = null;
    for (const d in tasks) for (const t of tasks[d]) {
      if (t.pin && !t.done && (!best || (t.pt || 0) > (best.pt || 0))) best = Object.assign({}, t, { date: d });
    }
    fm.writeString(path, JSON.stringify({ task: best }));
    return { task: best };
  } catch (e) {
    if (fm.fileExists(path)) return Object.assign(JSON.parse(fm.readString(path)), { offline: true });
    return { task: null, error: String(e.message || e) };
  }
}

function build(res) {
  const t = res.task, fam = config.widgetFamily || 'small';
  const w = new ListWidget();
  w.url = APP_URL;
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
  const when = t && t.rem ? t.rem.t : (t && t.time) || '';

  if (fam === 'accessoryInline') {
    w.addText(t ? t.t : 'Squirrel: нет задачи');
    return w;
  }
  if (fam === 'accessoryCircular') {
    const x = w.addText(t ? '●' : '○');
    x.font = Font.boldSystemFont(24);
    x.centerAlignText();
    return w;
  }
  if (fam === 'accessoryRectangular') {
    const h = w.addText('Squirrel');
    h.font = Font.boldSystemFont(11);
    h.textOpacity = 0.7;
    const m = w.addText(t ? t.t : 'Нет закреплённой задачи');
    m.font = Font.semiboldSystemFont(14);
    m.lineLimit = 2;
    if (when) { const s = w.addText(when); s.font = Font.systemFont(11); s.textOpacity = 0.7; }
    return w;
  }

  const base = (t && t.c) ? new Color(t.c) : new Color('#276EF0');
  w.backgroundColor = t ? base : new Color('#D4DBE9');
  const fg = t ? Color.white() : new Color('#393F4B');
  w.setPadding(14, 14, 14, 14);
  const h = w.addText('Squirrel');
  h.font = Font.boldSystemFont(12);
  h.textColor = fg;
  h.textOpacity = 0.75;
  w.addSpacer(6);
  const m = w.addText(t ? t.t : 'Пусто');
  m.font = Font.boldSystemFont(fam === 'small' ? 18 : 22);
  m.textColor = fg;
  m.lineLimit = fam === 'small' ? 4 : 3;
  w.addSpacer();
  const s = w.addText(t ? (when ? 'в ' + when : (t.cm || '')) : (res.error ? res.error : 'Закрепите задачу в Squirrel'));
  s.font = Font.systemFont(12);
  s.textColor = fg;
  s.textOpacity = 0.8;
  s.lineLimit = 2;
  if (res.offline) { const o = w.addText('нет сети'); o.font = Font.systemFont(10); o.textColor = fg; o.textOpacity = 0.6; }
  return w;
}

const res = await loadPinned();
const widget = build(res);
if (config.runsInWidget) Script.setWidget(widget);
else await widget.presentSmall();
Script.complete();
