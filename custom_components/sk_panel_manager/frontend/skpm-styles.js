// Styles for the SK Panel Manager panel. Built on Home Assistant theme variables
// so the panel follows light/dark and custom themes.
export const STYLES = `
:host {
  --pm-bg: var(--primary-background-color, #f4f6f8);
  --pm-card: var(--card-background-color, #fff);
  --pm-text: var(--primary-text-color, #1b2733);
  --pm-muted: var(--secondary-text-color, #66727f);
  --pm-line: var(--divider-color, rgba(0,0,0,.09));
  --pm-primary: var(--primary-color, #3f51cd);
  --pm-soft: color-mix(in srgb, var(--pm-primary) 10%, transparent);
  --pm-green: #2e9e6b;
  --pm-green-soft: color-mix(in srgb, #2e9e6b 16%, transparent);
  --pm-red: var(--error-color, #db4437);
  --pm-red-soft: color-mix(in srgb, var(--pm-red) 14%, transparent);
  --pm-amber: #f2a900;
  --pm-radius: 14px;
  --pm-shadow: var(--ha-card-box-shadow, 0 1px 2px rgba(0,0,0,.06), 0 2px 10px rgba(0,0,0,.04));
  display: flex; flex-direction: column; height: 100vh; background: var(--pm-bg); color: var(--pm-text);
  font-family: var(--ha-font-family-body, var(--paper-font-body1_-_font-family, Roboto, system-ui, sans-serif));
  -webkit-font-smoothing: antialiased;
}
* { box-sizing: border-box; }
button, input, select { font: inherit; color: inherit; }
button { cursor: pointer; }
:focus-visible { outline: 2px solid var(--pm-primary); outline-offset: 2px; }
.scroller { flex: 1; overflow: auto; position: relative; -webkit-overflow-scrolling: touch; }

/* header */
.toolbar { flex: none; z-index: 5; display: flex; align-items: center; gap: 8px;
  height: var(--header-height, 56px); padding: 0 12px; background: var(--app-header-background-color, var(--pm-primary));
  color: var(--app-header-text-color, #fff); border-bottom: var(--app-header-border-bottom, none); }
.toolbar .title { font-size: 20px; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 10px; }
.pill { background: rgba(255,255,255,.18); padding: 4px 12px; border-radius: 99px; font-size: 13px; white-space: nowrap; display: inline-flex; gap: 6px; align-items: center; }
.tabs { flex: none; z-index: 4; display: flex; gap: 2px; overflow-x: auto; scrollbar-width: none;
  background: var(--app-header-background-color, var(--pm-primary)); color: var(--app-header-text-color, #fff); padding: 0 8px; }
.tabs::-webkit-scrollbar { display: none; }
.tab { border: 0; background: none; padding: 12px 16px 10px; opacity: .75; border-bottom: 3px solid transparent;
  display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; font-weight: 500; font-size: 14px; }
.tab ha-icon { --mdc-icon-size: 18px; }
.tab.active { opacity: 1; border-bottom-color: currentColor; }
.tab:hover { opacity: 1; }
main { max-width: 1400px; margin: 0 auto; padding: 20px 16px 120px; font-size: 14px; }

/* building blocks */
.card { background: var(--pm-card); border-radius: var(--pm-radius); box-shadow: var(--pm-shadow); border: 1px solid var(--pm-line); }
.card > .head { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--pm-line); }
.card > .head h2 { margin: 0; font-size: 16px; font-weight: 500; flex: 1; }
.card > .body { padding: 16px; }
.muted { color: var(--pm-muted); }
.small { font-size: 12px; }
.grid { display: grid; gap: 16px; }
.row { display: flex; align-items: center; gap: 10px; }
.spacer { flex: 1; }
h3 { font-size: 13px; text-transform: uppercase; letter-spacing: .6px; color: var(--pm-muted); font-weight: 600; margin: 22px 0 10px; }
h3:first-child { margin-top: 0; }
.btn { border: 1px solid var(--pm-line); background: var(--pm-card); border-radius: 10px; padding: 8px 14px; display: inline-flex; align-items: center; gap: 6px; font-weight: 500; }
.btn:hover { border-color: var(--pm-primary); }
.btn.primary { background: var(--pm-primary); color: var(--text-primary-color, #fff); border-color: transparent; }
.btn.danger { color: var(--pm-red); }
.btn.ghost { border-color: transparent; background: none; }
.btn ha-icon { --mdc-icon-size: 18px; }
.btn[disabled] { opacity: .5; pointer-events: none; }
.chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 99px; font-size: 12px; font-weight: 500;
  background: var(--pm-soft); color: var(--pm-text); border: 1px solid transparent; white-space: nowrap; }
.chip ha-icon { --mdc-icon-size: 14px; }
.chip.toggle { cursor: pointer; background: none; border-color: var(--pm-line); }
.chip.toggle.on { background: var(--c, var(--pm-primary)); color: #fff; border-color: transparent; }
.badge { font-size: 11px; padding: 2px 8px; border-radius: 6px; background: var(--pm-soft); color: var(--pm-muted); font-weight: 600; white-space: nowrap; }
.badge.warn { background: color-mix(in srgb, var(--pm-amber) 20%, transparent); color: inherit; }
.avatar { width: 40px; height: 40px; border-radius: 50%; flex: none; display: grid; place-items: center; color: #fff; font-weight: 600; font-size: 15px; background: var(--c, #5c6bc0); }
.avatar.sm { width: 30px; height: 30px; font-size: 12px; }
.avatar.lg { width: 56px; height: 56px; font-size: 20px; }
.icon-box { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; background: var(--c, var(--pm-soft)); color: #fff; flex: none; }
.icon-box ha-icon { --mdc-icon-size: 20px; }
.empty { text-align: center; padding: 36px 16px; color: var(--pm-muted); }
.empty ha-icon { --mdc-icon-size: 48px; opacity: .5; display: block; margin: 0 auto 10px; }
.banner { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 12px; background: var(--pm-soft); margin-bottom: 16px; }
.banner.warn { background: color-mix(in srgb, var(--pm-amber) 18%, transparent); }
.banner.err { background: var(--pm-red-soft); }
input[type=text], input[type=search], select { width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--pm-line); background: var(--pm-bg); }
label.field { display: grid; gap: 6px; font-size: 12px; color: var(--pm-muted); font-weight: 500; }

/* switch */
.switch { position: relative; width: 40px; height: 22px; flex: none; border-radius: 99px; background: var(--pm-line); border: 0; transition: background .15s; }
.switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.3); transition: transform .15s; }
.switch.on { background: var(--pm-primary); }
.switch.on::after { transform: translateX(18px); }
.setting { display: flex; align-items: flex-start; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--pm-line); }
.setting:last-child { border-bottom: 0; }
.setting .txt { flex: 1; }
.setting .txt b { display: block; font-weight: 500; margin-bottom: 2px; }

/* segmented control */
.seg { display: inline-flex; border: 1px solid var(--pm-line); border-radius: 10px; overflow: hidden; flex: none; }
.seg button { border: 0; background: none; padding: 6px 12px; font-size: 13px; display: inline-flex; gap: 4px; align-items: center; color: var(--pm-muted); }
.seg button + button { border-left: 1px solid var(--pm-line); }
.seg button ha-icon { --mdc-icon-size: 16px; }
.seg button.on.inherit { background: var(--pm-soft); color: var(--pm-text); }
.seg button.on.allow { background: var(--pm-green); color: #fff; }
.seg button.on.deny { background: var(--pm-red); color: #fff; }

/* overview */
.kpis { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 16px; }
.kpi { padding: 16px; display: flex; gap: 14px; align-items: center; }
.kpi .val { font-size: 28px; font-weight: 600; line-height: 1.1; }
.kpi .lbl { font-weight: 500; }
.ov { display: grid; gap: 16px; grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr); align-items: start; }
.ucards { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); }
.ucard { padding: 14px; display: grid; gap: 10px; cursor: pointer; text-align: left; width: 100%; color: inherit; transition: border-color .15s, transform .15s; }
.ucard:hover { border-color: var(--pm-primary); transform: translateY(-1px); }
.ucard.off { opacity: .7; }
.ucard .name { font-weight: 600; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.meter { height: 6px; border-radius: 99px; background: var(--pm-red-soft); overflow: hidden; }
.meter > i { display: block; height: 100%; background: var(--pm-green); border-radius: 99px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.alert { display: flex; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--pm-line); align-items: flex-start; }
.alert:last-child { border-bottom: 0; }
.alert ha-icon { color: var(--pm-amber); --mdc-icon-size: 20px; flex: none; }
.alert.bad ha-icon { color: var(--pm-red); }

/* matrix */
.mwrap { overflow: auto; max-height: calc(100vh - 300px); min-height: 260px; border-radius: var(--pm-radius); }
table.matrix { border-collapse: separate; border-spacing: 0; min-width: 100%; }
.matrix th, .matrix td { border-bottom: 1px solid var(--pm-line); padding: 0; background: var(--pm-card); }
.matrix thead th { position: sticky; z-index: 2; }
.matrix thead tr.kinds th { top: 0; height: 30px; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: var(--pm-muted); font-weight: 600; text-align: left; padding: 0 10px; border-left: 1px solid var(--pm-line); }
.matrix thead tr.cols th { top: 30px; }
.matrix th.corner { left: 0; z-index: 3; min-width: 230px; text-align: left; padding: 0 14px; }
.matrix tbody th { position: sticky; left: 0; z-index: 1; text-align: left; font-weight: normal; padding: 8px 14px; min-width: 230px; border-right: 1px solid var(--pm-line); }
.colhead { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 6px; width: 92px; font-size: 12px; font-weight: 500; text-align: center; }
.colhead ha-icon { --mdc-icon-size: 22px; color: var(--pm-muted); }
.colhead em { font-style: normal; font-size: 10px; color: var(--pm-muted); font-weight: 400; }
.colhead span { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.25; }
.matrix tr.section th { background: var(--pm-bg); font-size: 11px; text-transform: uppercase; letter-spacing: .6px; color: var(--pm-muted); font-weight: 600; padding: 8px 14px; }
.matrix tr.section td { background: var(--pm-bg); }
.matrix tbody tr:hover th, .matrix tbody tr:hover td { background: color-mix(in srgb, var(--pm-primary) 4%, var(--pm-card)); }
.who { display: flex; align-items: center; gap: 10px; min-width: 0; }
.who .n { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.who .s { font-size: 11px; color: var(--pm-muted); }
.cell { width: 92px; height: 46px; border: 0; background: none; display: grid; place-items: center; }
.cell .dot { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; transition: transform .1s; }
.cell:hover .dot { transform: scale(1.12); }
.cell .dot ha-icon { --mdc-icon-size: 18px; }
.cell .dot.allow { background: var(--pm-green); color: #fff; }
.cell .dot.deny { background: var(--pm-red); color: #fff; }
.cell .dot.allow.inh { background: var(--pm-green-soft); color: var(--pm-green); }
.cell .dot.deny.inh { background: var(--pm-red-soft); color: var(--pm-red); }
.cell .dot.none { border: 1.5px dashed var(--pm-line); }
.cell.flash .dot { animation: cellflash .6s ease-out; }
@keyframes cellflash { 0% { transform: scale(1.35); box-shadow: 0 0 0 6px color-mix(in srgb, var(--pm-primary) 30%, transparent); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 transparent; } }
.matrix tbody tr:has(.cell.flash) th { box-shadow: inset 3px 0 0 var(--pm-primary); }
.cell.na, .cell.off { cursor: default; }
.cell.na .dot, .cell.off .dot { opacity: .35; }
.legend { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; margin-bottom: 12px; font-size: 13px; color: var(--pm-muted); }
.legend .cell { width: auto; height: auto; display: inline-flex; gap: 6px; }
.legend .cell .dot { width: 20px; height: 20px; border-radius: 6px; }
.legend .cell .dot ha-icon { --mdc-icon-size: 13px; }

/* users / profiles master-detail */
.md { display: grid; gap: 16px; grid-template-columns: 300px minmax(0, 1fr); align-items: start; }
.list { padding: 8px; display: grid; gap: 2px; }
.list .search { padding: 4px 4px 8px; }
.item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; border: 0; background: none; text-align: left; width: 100%; }
.item:hover { background: var(--pm-soft); }
.item.sel { background: var(--pm-soft); box-shadow: inset 3px 0 0 var(--pm-primary); }
.item .t { flex: 1; min-width: 0; }
.item .t b { display: block; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.detail { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr) 260px; align-items: start; }
.dhead { display: flex; align-items: center; gap: 14px; padding: 16px; }
.dhead h2 { margin: 0; font-size: 20px; font-weight: 500; }
.prow { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--pm-line); }
.prow:last-child { border-bottom: 0; }
.prow .pi { width: 34px; height: 34px; border-radius: 9px; display: grid; place-items: center; background: var(--pm-soft); flex: none; }
.prow .pi ha-icon { --mdc-icon-size: 20px; color: var(--pm-muted); }
.prow .pt { flex: 1; min-width: 0; }
.prow .pt b { font-weight: 500; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.prow.dim .pi, .prow.dim .pt { opacity: .5; }

/* sidebar preview */
.sb { position: sticky; top: 16px; overflow: hidden; }
.sb .sbh { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--pm-line); font-size: 15px; }
.sb .sbi { display: flex; align-items: center; gap: 14px; padding: 9px 16px; font-size: 14px; }
.sb .sbi ha-icon { --mdc-icon-size: 22px; color: var(--sidebar-icon-color, var(--pm-muted)); }
.sb .sbi.def { background: var(--pm-soft); font-weight: 500; }
.sb .sbi.def ha-icon { color: var(--pm-primary); }
.sb .sbi .tag { margin-left: auto; font-size: 10px; color: var(--pm-primary); font-weight: 600; text-transform: uppercase; }
.sb .sbi.hid { opacity: .45; text-decoration: line-through; }
.sb .sbsep { font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: var(--pm-muted); padding: 12px 16px 4px; border-top: 1px solid var(--pm-line); margin-top: 6px; }

/* sortable */
.sort { display: grid; gap: 6px; }
.sort .si { display: flex; align-items: center; gap: 10px; padding: 7px 6px 7px 8px; border-radius: 10px; border: 1px solid var(--pm-line);
  background: var(--pm-card); touch-action: none; user-select: none; -webkit-user-select: none; cursor: grab; position: relative;
  transition: transform .2s cubic-bezier(.2,.8,.2,1), box-shadow .2s, border-color .2s, background .2s; will-change: transform; }
.sort .si:hover { border-color: color-mix(in srgb, var(--pm-primary) 45%, var(--pm-line)); }
.sort .si:hover .grip { color: var(--pm-primary); }
.sort .si:focus-visible { outline: 2px solid var(--pm-primary); outline-offset: 1px; }
.sort .si .grip { color: var(--pm-muted); display: grid; transition: color .15s; }
.sort .si .pos { min-width: 18px; font-size: 12px; font-weight: 600; color: var(--pm-muted); font-variant-numeric: tabular-nums; text-align: center; }
.sort .si .pic { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; background: var(--pm-soft); flex: none; }
.sort .si .pic ha-icon { --mdc-icon-size: 18px; color: var(--pm-muted); }
.sort .si .pname { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sort .si .keys { display: flex; opacity: 0; transition: opacity .15s; }
.sort .si:hover .keys, .sort .si:focus-within .keys { opacity: 1; }
.btn.mini { padding: 2px; border-radius: 6px; }
.btn.mini ha-icon { --mdc-icon-size: 18px; }
.sort.sorting .si { cursor: grabbing; }
.sort.sorting .si .keys { opacity: 0; }
.sort .si.dragging { z-index: 5; transition: box-shadow .2s, border-color .2s; border-color: var(--pm-primary);
  box-shadow: 0 14px 30px rgba(0,0,0,.22), 0 2px 6px rgba(0,0,0,.12); background: var(--pm-card); }
.sort .si.dragging .grip, .sort .si.dragging .pos { color: var(--pm-primary); }
.sort .si.dragging .pic { background: var(--pm-primary); }
.sort .si.dragging .pic ha-icon { color: #fff; }
.sort .si.dropping { transition: transform .19s cubic-bezier(.2,.8,.2,1), box-shadow .19s; box-shadow: 0 2px 8px rgba(0,0,0,.12); }
.sort .si.dropped { animation: dropped .9s ease-out; }
@keyframes dropped { 0% { border-color: var(--pm-primary); background: color-mix(in srgb, var(--pm-primary) 16%, var(--pm-card)); }
  100% { border-color: var(--pm-line); background: var(--pm-card); } }
@media (hover: none) { .sort .si .keys { opacity: 1; } }

/* profiles */
.pcards { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
.palette { display: flex; gap: 8px; flex-wrap: wrap; }
.palette button { width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent; background: var(--c); }
.palette button.on { border-color: var(--pm-text); box-shadow: inset 0 0 0 2px var(--pm-card); }
.form2 { display: grid; gap: 14px; grid-template-columns: 2fr 1fr; }
.access { display: grid; gap: 12px; }
.access label.opt { display: flex; gap: 12px; padding: 14px; border: 1px solid var(--pm-line); border-radius: 12px; cursor: pointer; align-items: flex-start; }
.access label.opt.on { border-color: var(--pm-primary); background: var(--pm-soft); }
.access input { margin-top: 3px; }
ul.sec { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
ul.sec li { display: flex; gap: 8px; align-items: flex-start; }
ul.sec li ha-icon { --mdc-icon-size: 18px; flex: none; }

/* save bar + toast */
.savebar { position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%); z-index: 20; display: flex; gap: 10px; align-items: center;
  padding: 10px 10px 10px 18px; border-radius: 14px; background: var(--pm-card); box-shadow: 0 10px 40px rgba(0,0,0,.25); border: 1px solid var(--pm-line); white-space: nowrap; }
.savebar .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--pm-amber); }
.toast { position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%); z-index: 21; padding: 10px 18px; border-radius: 12px;
  background: #1f2937; color: #fff; display: flex; gap: 8px; align-items: center; animation: fade 2.6s forwards; }
.toast.err { background: var(--pm-red); }
@keyframes fade { 0%, 80% { opacity: 1; } 100% { opacity: 0; } }

@media (max-width: 1100px) {
  .ov { grid-template-columns: 1fr; }
  .detail { grid-template-columns: 1fr; }
  .sb { position: static; }
}
@media (max-width: 760px) {
  .md { grid-template-columns: minmax(0, 1fr); }
  .detail, .ov { grid-template-columns: minmax(0, 1fr); }
  .card > .head { flex-wrap: wrap; }
  .card > .head h2 { flex-basis: 60%; }
  .prow { flex-wrap: wrap; }
  .prow .seg { width: 100%; }
  .prow .seg button { flex: 1; justify-content: center; }
  .toolbar .pill { display: none; }
  .dhead { flex-wrap: wrap; }
  .form2 { grid-template-columns: 1fr; }
  main { padding: 14px 10px 120px; }
  .matrix th.corner, .matrix tbody th { min-width: 150px; }
  .savebar { left: 10px; right: 10px; transform: none; }
}
`;
