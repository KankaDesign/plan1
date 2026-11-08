// Squirrel: виджет закреплённой задачи для приложения Scriptable (iPhone / iPad).
// Показывает одну задачу, у которой в Squirrel включено «Закрепить на виджете».
// Отметили задачу выполненной, и виджет становится пустым, пока не закрепите новую.

const SUPABASE_URL = 'https://xxerdueuujjhdnnnsjqy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_781NXZH7stAFq6jGDh7Hrw_yvD7myJQ';
const APP_URL = 'https://kankadesign.github.io/plan1/';
const KC = 'squirrel-login';
const CACHE = 'squirrel-widget-cache.json';

function num(x) {
  if (typeof x === 'number') { return x; }
  return 0;
}

async function creds() {
  if (Keychain.contains(KC)) { return JSON.parse(Keychain.get(KC)); }
  const a = new Alert();
  a.title = 'Squirrel';
  a.message = 'Введите почту и пароль от аккаунта Squirrel. Они хранятся только в защищённом хранилище Scriptable на этом устройстве.';
  a.addTextField('Почта');
  a.addSecureTextField('Пароль');
  a.addAction('Сохранить');
  a.addCancelAction('Отмена');
  const r = await a.presentAlert();
  if (r < 0) { throw new Error('Вход отменён'); }
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
  if (!j.access_token) {
    Keychain.remove(KC);
    throw new Error('Не удалось войти. Запустите скрипт заново и введите данные.');
  }
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
    let tasks = {};
    if (rows.length > 0) {
      if (rows[0].tasks) { tasks = rows[0].tasks; }
    }
    let best = null;
    for (const d in tasks) {
      for (const t of tasks[d]) {
        if (!t.pin) { continue; }
        if (t.done) { continue; }
        if (best !== null) {
          if (num(t.pt) <= num(best.pt)) { continue; }
        }
        best = Object.assign({}, t, { date: d });
      }
    }
    fm.writeString(path, JSON.stringify({ task: best }));
    return { task: best };
  } catch (e) {
    if (fm.fileExists(path)) {
      const old = JSON.parse(fm.readString(path));
      old.offline = true;
      return old;
    }
    let msg = String(e);
    if (e instanceof Error) { msg = e.message; }
    return { task: null, error: msg };
  }
}

function build(res) {
  const t = res.task;
  let fam = 'small';
  if (config.widgetFamily) { fam = config.widgetFamily; }
  const w = new ListWidget();
  w.url = APP_URL;
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);

  let when = '';
  if (t) {
    if (t.rem) { when = t.rem.t; }
    else if (t.time) { when = t.time; }
  }

  if (fam === 'accessoryInline') {
    if (t) { w.addText(t.t); } else { w.addText('Squirrel: нет задачи'); }
    return w;
  }
  if (fam === 'accessoryCircular') {
    let mark = '○';
    if (t) { mark = '●'; }
    const x = w.addText(mark);
    x.font = Font.boldSystemFont(24);
    x.centerAlignText();
    return w;
  }
  if (fam === 'accessoryRectangular') {
    const h = w.addText('Squirrel');
    h.font = Font.boldSystemFont(11);
    h.textOpacity = 0.7;
    let title = 'Нет закреплённой задачи';
    if (t) { title = t.t; }
    const m = w.addText(title);
    m.font = Font.semiboldSystemFont(14);
    m.lineLimit = 2;
    if (when !== '') {
      const s = w.addText(when);
      s.font = Font.systemFont(11);
      s.textOpacity = 0.7;
    }
    return w;
  }

  let base = new Color('#276EF0');
  if (t) { if (t.c) { base = new Color(t.c); } }
  if (t) { w.backgroundColor = base; } else { w.backgroundColor = new Color('#D4DBE9'); }
  let fg = new Color('#393F4B');
  if (t) { fg = Color.white(); }
  w.setPadding(14, 14, 14, 14);

  const h = w.addText('Squirrel');
  h.font = Font.boldSystemFont(12);
  h.textColor = fg;
  h.textOpacity = 0.75;
  w.addSpacer(6);

  let title = 'Пусто';
  if (t) { title = t.t; }
  const m = w.addText(title);
  let size = 22;
  let lines = 3;
  if (fam === 'small') { size = 18; lines = 4; }
  m.font = Font.boldSystemFont(size);
  m.textColor = fg;
  m.lineLimit = lines;
  w.addSpacer();

  let sub = 'Закрепите задачу в Squirrel';
  if (res.error) { sub = res.error; }
  if (t) {
    sub = '';
    if (when !== '') { sub = 'в ' + when; }
    else if (t.cm) { sub = t.cm; }
  }
  const s = w.addText(sub);
  s.font = Font.systemFont(12);
  s.textColor = fg;
  s.textOpacity = 0.8;
  s.lineLimit = 2;
  if (res.offline) {
    const o = w.addText('нет сети');
    o.font = Font.systemFont(10);
    o.textColor = fg;
    o.textOpacity = 0.6;
  }
  return w;
}

const res = await loadPinned();
const widget = build(res);
if (config.runsInWidget) { Script.setWidget(widget); }
else { await widget.presentSmall(); }
Script.complete();
