const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./primitives-CW_t7MF1.js","./lil-gui.esm-7jLSJ8mk.js","./timing-C6hGHrFN.js"])))=>i.map(i=>d[i]);
import"./modulepreload-polyfill-P2Xu9kJm.js";import{_ as e,a as t,b as n,c as r,d as i,f as a,g as o,h as s,i as c,l,m as u,n as d,o as f,p,r as m,s as h,t as g,u as _,v,x as y,y as b}from"./preload-helper-oS5TvXPM.js";var x=`#version 300 es

// One colour for every fragment. Points are round: fragments outside the circle are dropped.

precision highp float;

uniform vec3 color;
uniform float pointSize;

out vec4 fragColor;

void main() {
    if (pointSize > 0.0 && length(gl_PointCoord - 0.5) > 0.5) {
        discard;
    }
    fragColor = vec4(color, 1.0);
}
`,S=`#version 300 es

// Lines and points on top of the raster, in pixel coordinates of the raster (y down).

in vec2 position;

uniform vec2 size;
uniform float pointSize;

void main() {
    float x = 2.0 * position.x / size.x - 1.0;
    float y = 1.0 - 2.0 * position.y / size.y;
    gl_Position = vec4(x, y, 0.0, 1.0);
    gl_PointSize = pointSize;
}
`,C=`#version 300 es

// Runs once for every fragment. Either colours the fragment by the triangle it belongs to, or
// gives every fragment the same colour, which Verblendung adds to the pixel.

precision highp float;

flat in int corner;

// One colour per corner index; a triangle gets the colour of its last corner.
uniform vec3 colors[6];
// true: every fragment gets addColor.
uniform bool adding;
uniform vec3 addColor;

out vec4 fragColor;

void main() {
    if (adding) {
        fragColor = vec4(addColor, 1.0);
    } else {
        fragColor = vec4(colors[corner % 6], 1.0);
    }
}
`,w=`#version 300 es

// Runs once per corner. position is in pixel coordinates of the raster: x to the right, y down,
// (0, 0) at the top left.

in vec2 position;

uniform vec2 size;

// The index of the corner in the vertex array. flat: a triangle's fragments all get the value of
// its last corner, without interpolation.
flat out int corner;

void main() {
    corner = gl_VertexID;

    // From pixel coordinates to NDC; y is turned around, because it points up in NDC.
    float x = 2.0 * position.x / size.x - 1.0;
    float y = 1.0 - 2.0 * position.y / size.y;
    gl_Position = vec4(x, y, 0.0, 1.0);
}
`,T=`#version 300 es

// Runs once for every fragment. The colour is half transparent; Verblendung mixes it with the
// colour already in the raster.

precision highp float;

flat in int parity;

out vec4 fragColor;

void main() {
    vec3 color = parity == 0 ? vec3(0.36, 0.62, 0.93) : vec3(0.88, 0.56, 0.36);
    fragColor = vec4(color, 0.5);
}
`,E=`#version 300 es

// Runs once per corner. position is in pixel coordinates of the raster: x to the right, y down,
// (0, 0) at the top left.

in vec2 position;

uniform vec2 size;

// 0 or 1, alternating from triangle to triangle, so the triangles can be told apart.
flat out int parity;

void main() {
    parity = (gl_VertexID / 3) % 2;

    float x = 2.0 * position.x / size.x - 1.0;
    float y = 1.0 - 2.0 * position.y / size.y;
    gl_Position = vec4(x, y, 0.0, 1.0);
}
`,D=y({steppers:()=>O}),O={circle:B},k=14,A=12,j=7,M=6,N=5,P=2,F=1,I=12,L=11,R=100,z={background:`#15171c`,empty:`#1d2027`,grid:`#2e333d`,fragment:`#3a3f4b`,kept:`#5c9ded`,discarded:`#4a2d33`,current:`#e0905c`,centre:`#73798a`,shape:`#d9dce2`,text:`#d9dce2`,muted:`#9aa0ad`};function B(e){let t=[];for(let e=F;e<L;e++)for(let n=P;n<I;n++){let r=n+.5,i=e+.5;t.push({i:n,j:e,f:(r-j)**2+(i-M)**2-N**2})}let n=t.length+1,r=document.createElement(`canvas`),i=document.createElement(`button`);i.textContent=`Zurück`;let a=document.createElement(`button`);a.textContent=`Weiter`;let o=document.createElement(`button`);o.textContent=`Abspielen`;let s=document.createElement(`div`);s.className=`stepper-bar`,s.append(i,a,o);let c=document.createElement(`table`);c.className=`stepper-state`,c.innerHTML=`
        <tr><th>Schritt</th><th>Fragment-Shader-Aufrufe</th><th>verworfen</th><th>gesetzte Pixel</th></tr>
        <tr><td></td><td></td><td></td><td></td></tr>`;let l=c.querySelectorAll(`td`);e.append(r,s,c);let u=0,d;i.addEventListener(`click`,()=>{f(),u=Math.max(0,u-1),p()}),a.addEventListener(`click`,()=>{f(),u=Math.min(n,u+1),p()}),o.addEventListener(`click`,()=>{d===void 0?(u===n&&(u=0),o.textContent=`Anhalten`,d=window.setInterval(()=>{u+=1,u===n&&f(),p()},R),p()):f()}),window.addEventListener(`resize`,p);function f(){window.clearInterval(d),d=void 0,o.textContent=`Abspielen`}function p(){let e=r.getContext(`2d`);if(e===null)return;let o=window.devicePixelRatio||1;r.width=Math.floor(r.clientWidth*o),r.height=Math.floor(r.clientHeight*o),e.setTransform(o,0,0,o,0,0);let s=r.clientWidth,c=r.clientHeight;e.fillStyle=z.background,e.fillRect(0,0,s,c);let d=(c-32)/A;if(d<=0)return;let f=Math.max(0,u-1),p=u>=2?t[u-2]:void 0;for(let t=0;t<A;t++)for(let n=0;n<k;n++)e.fillStyle=z.empty,e.fillRect(16+n*d,16+t*d,d,d);u>=1&&t.forEach((t,n)=>{let r=z.fragment;n<f&&(r=t.f>0?z.discarded:z.kept),t===p&&(r=z.current),e.fillStyle=r,e.fillRect(16+t.i*d,16+t.j*d,d,d)}),e.strokeStyle=z.grid,e.lineWidth=1,e.beginPath();for(let t=0;t<=k;t++)e.moveTo(16+t*d,16),e.lineTo(16+t*d,16+A*d);for(let t=0;t<=A;t++)e.moveTo(16,16+t*d),e.lineTo(16+k*d,16+t*d);e.stroke(),e.fillStyle=z.centre;for(let t=0;t<A;t++)for(let n=0;n<k;n++)e.beginPath(),e.arc(16+(n+.5)*d,16+(t+.5)*d,1.5,0,2*Math.PI),e.fill();e.strokeStyle=z.shape,e.lineWidth=2,e.strokeRect(16+P*d,16+F*d,10*d,10*d),e.beginPath(),e.moveTo(16+P*d,16+F*d),e.lineTo(16+I*d,16+L*d),e.stroke(),e.beginPath(),e.arc(16+j*d,16+M*d,N*d,0,2*Math.PI),e.stroke(),e.fillStyle=z.shape,e.beginPath(),e.arc(16+j*d,16+M*d,3,0,2*Math.PI),e.fill(),e.lineWidth=1,m(e,p,16+k*d+32,16);let h=t.slice(0,f).filter(e=>e.f>0).length;l[0].textContent=`${u} von ${n}`,l[1].textContent=String(f),l[2].textContent=String(h),l[3].textContent=String(f-h),i.disabled=u===0,a.disabled=u===n}function m(e,n,r,i){let a=[];if(u===0)a.push(`Ein Quadrat aus zwei Dreiecken`,`um den Kreis mit M = (${j}, ${M}), r = ${N}.`);else if(n===void 0)a.push(`Die GPU rasterisiert beide Dreiecke:`,`${t.length} Fragmente, eines pro Pixelzentrum im Quadrat.`);else{let e=n.i+.5,t=n.j+.5;a.push(`Fragment-Shader für Pixel (${n.i}, ${n.j})`,`Pixelzentrum (x, y) = (${e}, ${t})`,``,`F(x, y) = (x − xₘ)² + (y − yₘ)² − r²`,`        = ${(e-j)**2} + ${(t-M)**2} − ${N**2}`,`        = ${String(n.f).replace(`-`,`−`)}`,``,n.f>0?`F > 0: außerhalb, discard`:`F < 0: innen, Farbe schreiben`)}e.font=`13px ui-monospace, monospace`,e.textAlign=`left`,e.textBaseline=`top`,a.forEach((t,n)=>{e.fillStyle=n===0||n===a.length-1?z.text:z.muted,e.fillText(t,r,i+n*20)})}p()}var V={"#404740":`#949aa6`,"#708":`#c792ea`,"#219":`#82aaff`,"#164":`#f78c6c`,"#a11":`#c3e88d`,"#e40":`#ffcb6b`,"#00f":`#82aaff`,"#30a":`#d9dce2`,"#085":`#4fb8b8`,"#167":`#ffcb6b`,"#256":`#c792ea`,"#00c":`#82aaff`,"#940":`#7f8796`,"#f00":`#ff6b6b`},H=r.define(_.specs.map(e=>({...e,color:typeof e.color==`string`?V[e.color]??e.color:void 0}))),U=u.theme({"&":{height:`100%`,backgroundColor:`var(--surface)`,color:`var(--text)`},".cm-scroller":{fontFamily:`ui-monospace, monospace`,fontSize:`0.8rem`},".cm-content":{caretColor:`var(--text)`},".cm-gutters":{backgroundColor:`var(--surface)`,color:`var(--muted)`,border:`none`},".cm-activeLine, .cm-activeLineGutter":{backgroundColor:`#ffffff0a`},"&.cm-focused .cm-selectionBackground, .cm-selectionBackground":{backgroundColor:`#3a4252`},".cm-error-line":{backgroundColor:`color-mix(in srgb, var(--error) 22%, transparent)`}},{dark:!0}),W=b.define(),G=n.define({create:()=>p.none,update(e,t){for(let e of t.effects)if(e.is(W)){let n=t.state.doc,r=e.value.filter(e=>e>=1&&e<=n.lines).map(e=>p.line({class:`cm-error-line`}).range(n.line(e).from));return p.set(r,!0)}return t.docChanged?p.none:e},provide:e=>u.decorations.from(e)});function K(e){return e===`glsl`||/\.(vert|frag)$/.test(e)?d():[`ts`,`typescript`,`js`,`javascript`].includes(e)?m({typescript:!0}):[]}function q(){for(let e of document.querySelectorAll(`pre.listing`)){let t=new u({doc:(e.textContent??``).replace(/\n$/,``),extensions:[U,a(H),v.readOnly.of(!0),u.editable.of(!1),K(e.dataset.language??``)]});t.dom.classList.add(`listing`),e.replaceWith(t.dom)}}function ee(n,r,d,p,m){let g=document.createElement(`div`);g.className=`editor-header`;let _=document.createElement(`div`);_.className=`editor-tabs`;let v=document.createElement(`button`);v.className=`editor-save`,v.textContent=`Save`;let y=document.createElement(`button`);y.className=`editor-run`,y.textContent=`Run`,g.append(_,v,y);let b=document.createElement(`div`);b.className=`editor-code`;let x=document.createElement(`pre`);x.className=`editor-log`,n.append(g,b,x);let S=``;function C(e,t){x.textContent=S===``?e:`${S}\n${e}`,x.classList.toggle(`failed`,t),S=``}let w={},T={};for(let n of d){let r=p[n]??``;T[n]=r.replaceAll(`\r
`,`
`);let d=document.createElement(`div`);d.className=`editor-file`,b.append(d),w[n]=new u({doc:r,parent:d,extensions:[U,e(),s(),t(),i(),l(),a(H),o.of([...c,...f,h]),K(n),G]});let m=document.createElement(`button`);m.textContent=n,m.addEventListener(`click`,()=>E(n)),_.append(m)}function E(e){d.forEach((t,n)=>{b.children[n].toggleAttribute(`hidden`,t!==e),_.children[n].classList.toggle(`active`,t===e)})}d.length>0&&E(d[0]);function D(){let e={};for(let t of d)e[t]=w[t].state.doc.toString();return e}async function O(){for(let e of d){let t=w[e].state.doc.toString();if(t===T[e])continue;let n=await fetch(`/__playground/save`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({page:location.pathname,demo:r,file:e,source:t,loaded:T[e]})});if(!n.ok)return C(`${e}: ${(await n.json()).error??`Speichern fehlgeschlagen`}`,!0),!1;T[e]=t}return C(`Gespeichert.`,!1),!0}return v.addEventListener(`click`,()=>void O()),y.addEventListener(`click`,()=>{O().then(e=>{e&&m(D())})}),{setSource(e,t){let n=w[e];if(n===void 0)return!0;let r=t.replaceAll(`\r
`,`
`);if(r===T[e])return!1;let i=n.state.doc.toString()!==T[e];return n.dispatch({changes:{from:0,to:n.state.doc.length,insert:r}}),T[e]=r,S=i?`${e} wurde in der IDE geändert und neu geladen; deine ungespeicherten Änderungen sind verworfen.`:`${e} wurde in der IDE geändert und neu geladen.`,!0},showLog(e,t){C(e,t);for(let n of d){let r=[];t&&e.includes(`${n}:`)&&(r=[...e.matchAll(/ERROR: \d+:(\d+):/g)].map(e=>Number(e[1]))),w[n].dispatch({effects:W.of(r)})}}}}var J=12,te=Object.assign({"../src/primitives/index.ts":()=>g(()=>import(`./primitives-CW_t7MF1.js`),__vite__mapDeps([0,1]),import.meta.url),"../src/results/index.ts":()=>g(()=>import(`./results-t85A3FNZ.js`),[],import.meta.url),"../src/solution/index.ts":()=>g(()=>import(`./solution-BWkyalID.js`),[],import.meta.url),"../src/timing/index.ts":()=>g(()=>import(`./timing-C6hGHrFN.js`),__vite__mapDeps([2,1]),import.meta.url)}),ne=Object.assign({"../src/primitives/shape.frag":x,"../src/primitives/shape.vert":S,"../src/primitives/triangles.frag":C,"../src/primitives/triangles.vert":w,"../src/timing/square.frag":T,"../src/timing/square.vert":E}),re=Object.assign({"./stepper.ts":D})[`./stepper.ts`]?.steppers??{},ie=[];function Y(e){let t={};for(let[n,r]of Object.entries(ne))n.startsWith(`../src/${e}/`)&&(t[n.slice(`../src/${e}/`.length)]=r);return t}function X(e){let t=document.createElement(`div`);return t.className=`demo-error`,t.textContent=e,t}function Z(e){return e instanceof Error?e.message:String(e)}function ae(e){if(e.module?.rebuild===void 0)Q(e);else try{e.module.rebuild(e.sources),e.editor?.showLog(`Kompiliert.`,!1)}catch(t){console.error(`Demo ${e.name}:`,t),e.editor?.showLog(Z(t),!0)}}async function Q(e){let t=document.createElement(`canvas`),n=document.createElement(`div`);n.className=`controls`,e.view.replaceChildren(t,n),e.module=void 0;try{let r=te[`../src/${e.name}/index.ts`];if(r===void 0)throw Error(`src/${e.name}/index.ts nicht gefunden`);let i=await r();await i.start(t,n,e.sources),e.module=i,i.setVisible?.(e.visible),e.editor?.showLog(``,!1)}catch(t){console.error(`Demo ${e.name}:`,t);let n=Z(t);e.view.replaceChildren(X(`Demo konnte nicht gestartet werden: ${n.split(`
`)[0]}`)),e.editor?.showLog(n,!0)}}function oe(e){let t=e.dataset.demo??``,n=(e.dataset.files??``).split(`,`).filter(e=>e!==``).sort((e,t)=>Number(e.endsWith(`.frag`))-Number(t.endsWith(`.frag`))),r=document.createElement(`div`);r.className=`demo-view`;let i=document.createElement(`button`);i.className=`fullscreen`,i.textContent=`Vollbild`,i.addEventListener(`click`,()=>{document.fullscreenElement===e?document.exitFullscreen():e.requestFullscreen()}),e.append(r,i);let a={name:t,path:new URL(`./src/${t}/`,location.href).pathname,view:r,sources:Y(t),module:void 0,editor:void 0,visible:!1};if(ie.push(a),new IntersectionObserver(e=>{for(let t of e)a.visible=t.isIntersecting,a.module?.setVisible?.(a.visible)}).observe(e),n.length>0){let r=document.createElement(`div`);r.className=`editor`,e.classList.add(`has-editor`),e.prepend(r),a.editor=ee(r,t,n,a.sources,e=>{a.sources={...a.sources,...e},ae(a)})}Q(a)}q();for(let e of document.querySelectorAll(`.copy-path`))e.addEventListener(`click`,()=>{navigator.clipboard.writeText(e.dataset.path??``).then(()=>{e.classList.add(`copied`),setTimeout(()=>e.classList.remove(`copied`),1500)})});var se=[];for(let e of document.querySelectorAll(`.textfield`)){let t=e.dataset.file??``,n=e.querySelector(`textarea`);if(n===null)continue;let r=document.createElement(`button`);r.type=`button`,r.textContent=`Save`;let i=document.createElement(`span`),a=document.createElement(`div`);a.className=`textfield-bar`,a.append(r,t,i),e.append(a);let o={path:new URL(`./${t}`,location.href).pathname,area:n,saved:n.value,status:i};se.push(o),n.addEventListener(`input`,()=>{i.textContent=n.value===o.saved?``:`nicht gespeichert`,i.classList.remove(`failed`)}),r.addEventListener(`click`,()=>{let e=n.value;fetch(`/__playground/save-text`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({page:location.pathname,file:t,source:e,loaded:o.saved})}).then(async t=>{if(t.ok)o.saved=e,i.textContent=`gespeichert`,i.classList.remove(`failed`);else{let e=await t.json();i.textContent=e.error??`Speichern fehlgeschlagen`,i.classList.add(`failed`)}})})}for(let e of document.querySelectorAll(`.quiz`)){let t=[...e.querySelectorAll(`.question`)],n=e.querySelector(`.quiz-result span`);e.querySelector(`.quiz-result button`)?.addEventListener(`click`,()=>{let e=0;for(let n of t){let t=!0,r=!1;for(let e of n.querySelectorAll(`input`)){let n=e.dataset.correct===`true`,i=e.closest(`.option`);i?.classList.toggle(`right`,e.checked&&n),i?.classList.toggle(`wrong`,e.checked&&!n),e.checked!==n&&(t=!1),e.checked&&n&&(r=!0)}n.classList.toggle(`right`,t),n.classList.toggle(`partial`,!t&&r),n.classList.toggle(`wrong`,!t&&!r),t&&(e+=1)}n!==null&&(n.textContent=`${e} von ${t.length} Fragen richtig`)});for(let e of t)e.addEventListener(`change`,()=>{for(let t of[e,...e.querySelectorAll(`.option`)])t.classList.remove(`right`,`partial`,`wrong`)})}for(let e of document.querySelectorAll(`.stepper`)){let t=e.dataset.stepper??``;try{let n=re[t];if(n===void 0)throw Error(`${t} nicht in config/stepper.ts gefunden`);n(e)}catch(n){console.error(`Step-through ${t}:`,n),e.replaceChildren(X(`Step-through konnte nicht gestartet werden: ${Z(n).split(`
`)[0]}`))}}var $=0;for(let e of document.querySelectorAll(`.demo`))Object.keys(Y(e.dataset.demo??``)).length>0&&($+=1),$<=J&&oe(e);$>J&&document.querySelector(`main header`)?.after(X(`Diese Seite hat ${$} WebGL-Demos, erlaubt sind höchstens ${J}.`));