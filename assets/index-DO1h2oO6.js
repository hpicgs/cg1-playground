const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./metaballs-C4YWshEd.js","./lil-gui.esm-7jLSJ8mk.js","./one-ball-Phr3HKhV.js","./palette-B5MJ_73s.js","./psychedelic-CbGu0xCp.js"])))=>i.map(i=>d[i]);
import"./modulepreload-polyfill-P2Xu9kJm.js";import{_ as e,a as t,b as n,c as r,d as i,f as a,g as o,h as s,i as c,l,m as u,n as d,o as f,p,r as m,s as h,t as g,u as _,v,x as y,y as b}from"./preload-helper-oS5TvXPM.js";var x=`#version 300 es

// Metaballs, filled where F > T.

precision highp float;

uniform vec2 size;
uniform vec3 balls[8];
uniform int count;
uniform float lambda;
uniform float threshold;
uniform vec3 insideColor;
uniform vec3 outsideColor;

in vec2 uv;

out vec4 fragColor;

// F at the position p.
float field(vec2 p) {
    // TODO: implement your code here.
    return 0.0;
}

void main() {
    // TODO: implement your code here.
    fragColor = vec4(outsideColor, 1.0);
}
`,S=`#version 300 es

// Two triangles that cover the canvas. uv runs from (0, 0) at the top left to (1, 1) at the
// bottom right, like the pixel (i, j).

in vec2 position;

out vec2 uv;

void main() {
    uv = vec2(0.5 + 0.5 * position.x, 0.5 - 0.5 * position.y);
    gl_Position = vec4(position, 0.0, 1.0);
}
`,C=`#version 300 es

// One ball, filled where f > T.

precision highp float;

uniform vec2 size;
uniform vec3 ball;
uniform float lambda;
uniform float threshold;
uniform vec3 insideColor;
uniform vec3 outsideColor;

in vec2 uv;

out vec4 fragColor;

void main() {
    // TODO: implement your code here.
    fragColor = vec4(outsideColor, 1.0);
}
`,w=`#version 300 es

// Two triangles that cover the canvas. uv runs from (0, 0) at the top left to (1, 1) at the
// bottom right, like the pixel (i, j).

in vec2 position;

out vec2 uv;

void main() {
    uv = vec2(0.5 + 0.5 * position.x, 0.5 - 0.5 * position.y);
    gl_Position = vec4(position, 0.0, 1.0);
}
`,T=`#version 300 es

// Metaballs in your own colours.

precision highp float;

uniform vec2 size;
uniform vec3 balls[8];
uniform int count;
uniform float lambda;
uniform float threshold;
uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;

in vec2 uv;

out vec4 fragColor;

// F at the position p.
float field(vec2 p) {
    // TODO: implement your code here.
    return 0.0;
}

void main() {
    // TODO: implement your code here.
    fragColor = vec4(color1, 1.0);
}
`,E=`#version 300 es

// Two triangles that cover the canvas. uv runs from (0, 0) at the top left to (1, 1) at the
// bottom right, like the pixel (i, j).

in vec2 position;

out vec2 uv;

void main() {
    uv = vec2(0.5 + 0.5 * position.x, 0.5 - 0.5 * position.y);
    gl_Position = vec4(position, 0.0, 1.0);
}
`,D=`#version 300 es

// Metaballs in colour.

precision highp float;

uniform vec2 size;
uniform vec3 balls[8];
uniform int count;
uniform float lambda;

in vec2 uv;

out vec4 fragColor;

// F at the position p.
float field(vec2 p) {
    // TODO: implement your code here.
    return 0.0;
}

void main() {
    // TODO: implement your code here.
    fragColor = vec4(uv, 0.0, 1.0);
}
`,O=`#version 300 es

// Two triangles that cover the canvas. uv runs from (0, 0) at the top left to (1, 1) at the
// bottom right, like the pixel (i, j).

in vec2 position;

out vec2 uv;

void main() {
    uv = vec2(0.5 + 0.5 * position.x, 0.5 - 0.5 * position.y);
    gl_Position = vec4(position, 0.0, 1.0);
}
`,k=y({steppers:()=>A}),A={},j={"#404740":`#949aa6`,"#708":`#c792ea`,"#219":`#82aaff`,"#164":`#f78c6c`,"#a11":`#c3e88d`,"#e40":`#ffcb6b`,"#00f":`#82aaff`,"#30a":`#d9dce2`,"#085":`#4fb8b8`,"#167":`#ffcb6b`,"#256":`#c792ea`,"#00c":`#82aaff`,"#940":`#7f8796`,"#f00":`#ff6b6b`},M=r.define(_.specs.map(e=>({...e,color:typeof e.color==`string`?j[e.color]??e.color:void 0}))),N=u.theme({"&":{height:`100%`,backgroundColor:`var(--surface)`,color:`var(--text)`},".cm-scroller":{fontFamily:`ui-monospace, monospace`,fontSize:`0.8rem`},".cm-content":{caretColor:`var(--text)`},".cm-gutters":{backgroundColor:`var(--surface)`,color:`var(--muted)`,border:`none`},".cm-activeLine, .cm-activeLineGutter":{backgroundColor:`#ffffff0a`},"&.cm-focused .cm-selectionBackground, .cm-selectionBackground":{backgroundColor:`#3a4252`},".cm-error-line":{backgroundColor:`color-mix(in srgb, var(--error) 22%, transparent)`}},{dark:!0}),P=b.define(),F=n.define({create:()=>p.none,update(e,t){for(let e of t.effects)if(e.is(P)){let n=t.state.doc,r=e.value.filter(e=>e>=1&&e<=n.lines).map(e=>p.line({class:`cm-error-line`}).range(n.line(e).from));return p.set(r,!0)}return t.docChanged?p.none:e},provide:e=>u.decorations.from(e)});function I(e){return e===`glsl`||/\.(vert|frag)$/.test(e)?d():[`ts`,`typescript`,`js`,`javascript`].includes(e)?m({typescript:!0}):[]}function L(){for(let e of document.querySelectorAll(`pre.listing`)){let t=new u({doc:(e.textContent??``).replace(/\n$/,``),extensions:[N,a(M),v.readOnly.of(!0),u.editable.of(!1),I(e.dataset.language??``)]});t.dom.classList.add(`listing`),e.replaceWith(t.dom)}}function R(n,r,d,p,m){let g=document.createElement(`div`);g.className=`editor-header`;let _=document.createElement(`div`);_.className=`editor-tabs`;let v=document.createElement(`button`);v.className=`editor-save`,v.textContent=`Save`;let y=document.createElement(`button`);y.className=`editor-run`,y.textContent=`Run`,g.append(_,v,y);let b=document.createElement(`div`);b.className=`editor-code`;let x=document.createElement(`pre`);x.className=`editor-log`,n.append(g,b,x);let S=``;function C(e,t){x.textContent=S===``?e:`${S}\n${e}`,x.classList.toggle(`failed`,t),S=``}let w={},T={};for(let n of d){let r=p[n]??``;T[n]=r.replaceAll(`\r
`,`
`);let d=document.createElement(`div`);d.className=`editor-file`,b.append(d),w[n]=new u({doc:r,parent:d,extensions:[N,e(),s(),t(),i(),l(),a(M),o.of([...c,...f,h]),I(n),F]});let m=document.createElement(`button`);m.textContent=n,m.addEventListener(`click`,()=>E(n)),_.append(m)}function E(e){d.forEach((t,n)=>{b.children[n].toggleAttribute(`hidden`,t!==e),_.children[n].classList.toggle(`active`,t===e)})}d.length>0&&E(d[0]);function D(){let e={};for(let t of d)e[t]=w[t].state.doc.toString();return e}async function O(){for(let e of d){let t=w[e].state.doc.toString();if(t===T[e])continue;let n=await fetch(`/__playground/save`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({page:location.pathname,demo:r,file:e,source:t,loaded:T[e]})});if(!n.ok)return C(`${e}: ${(await n.json()).error??`Speichern fehlgeschlagen`}`,!0),!1;T[e]=t}return C(`Gespeichert.`,!1),!0}return v.addEventListener(`click`,()=>void O()),y.addEventListener(`click`,()=>{O().then(e=>{e&&m(D())})}),{setSource(e,t){let n=w[e];if(n===void 0)return!0;let r=t.replaceAll(`\r
`,`
`);if(r===T[e])return!1;let i=n.state.doc.toString()!==T[e];return n.dispatch({changes:{from:0,to:n.state.doc.length,insert:r}}),T[e]=r,S=i?`${e} wurde in der IDE geändert und neu geladen; deine ungespeicherten Änderungen sind verworfen.`:`${e} wurde in der IDE geändert und neu geladen.`,!0},showLog(e,t){C(e,t);for(let n of d){let r=[];t&&e.includes(`${n}:`)&&(r=[...e.matchAll(/ERROR: \d+:(\d+):/g)].map(e=>Number(e[1]))),w[n].dispatch({effects:P.of(r)})}}}}var z=12,B=Object.assign({"../src/metaballs/index.ts":()=>g(()=>import(`./metaballs-C4YWshEd.js`),__vite__mapDeps([0,1]),import.meta.url),"../src/one-ball/index.ts":()=>g(()=>import(`./one-ball-Phr3HKhV.js`),__vite__mapDeps([2,1]),import.meta.url),"../src/palette/index.ts":()=>g(()=>import(`./palette-B5MJ_73s.js`),__vite__mapDeps([3,1]),import.meta.url),"../src/psychedelic/index.ts":()=>g(()=>import(`./psychedelic-CbGu0xCp.js`),__vite__mapDeps([4,1]),import.meta.url)}),V=Object.assign({"../src/metaballs/metaballs.frag":x,"../src/metaballs/quad.vert":S,"../src/one-ball/one-ball.frag":C,"../src/one-ball/quad.vert":w,"../src/palette/palette.frag":T,"../src/palette/quad.vert":E,"../src/psychedelic/psychedelic.frag":D,"../src/psychedelic/quad.vert":O}),H=Object.assign({"./stepper.ts":k})[`./stepper.ts`]?.steppers??{},U=[];function W(e){let t={};for(let[n,r]of Object.entries(V))n.startsWith(`../src/${e}/`)&&(t[n.slice(`../src/${e}/`.length)]=r);return t}function G(e){let t=document.createElement(`div`);return t.className=`demo-error`,t.textContent=e,t}function K(e){return e instanceof Error?e.message:String(e)}function q(e){if(e.module?.rebuild===void 0)J(e);else try{e.module.rebuild(e.sources),e.editor?.showLog(`Kompiliert.`,!1)}catch(t){console.error(`Demo ${e.name}:`,t),e.editor?.showLog(K(t),!0)}}async function J(e){let t=document.createElement(`canvas`),n=document.createElement(`div`);n.className=`controls`,e.view.replaceChildren(t,n),e.module=void 0;try{let r=B[`../src/${e.name}/index.ts`];if(r===void 0)throw Error(`src/${e.name}/index.ts nicht gefunden`);let i=await r();await i.start(t,n,e.sources),e.module=i,i.setVisible?.(e.visible),e.editor?.showLog(``,!1)}catch(t){console.error(`Demo ${e.name}:`,t);let n=K(t);e.view.replaceChildren(G(`Demo konnte nicht gestartet werden: ${n.split(`
`)[0]}`)),e.editor?.showLog(n,!0)}}function Y(e){let t=e.dataset.demo??``,n=(e.dataset.files??``).split(`,`).filter(e=>e!==``).sort((e,t)=>Number(e.endsWith(`.frag`))-Number(t.endsWith(`.frag`))),r=document.createElement(`div`);r.className=`demo-view`;let i=document.createElement(`button`);i.className=`fullscreen`,i.textContent=`Vollbild`,i.addEventListener(`click`,()=>{document.fullscreenElement===e?document.exitFullscreen():e.requestFullscreen()}),e.append(r,i);let a={name:t,path:new URL(`./src/${t}/`,location.href).pathname,view:r,sources:W(t),module:void 0,editor:void 0,visible:!1};if(U.push(a),new IntersectionObserver(e=>{for(let t of e)a.visible=t.isIntersecting,a.module?.setVisible?.(a.visible)}).observe(e),n.length>0){let r=document.createElement(`div`);r.className=`editor`,e.classList.add(`has-editor`),e.prepend(r),a.editor=R(r,t,n,a.sources,e=>{a.sources={...a.sources,...e},q(a)})}J(a)}L();for(let e of document.querySelectorAll(`.copy-path`))e.addEventListener(`click`,()=>{navigator.clipboard.writeText(e.dataset.path??``).then(()=>{e.classList.add(`copied`),setTimeout(()=>e.classList.remove(`copied`),1500)})});var X=[];for(let e of document.querySelectorAll(`.textfield`)){let t=e.dataset.file??``,n=e.querySelector(`textarea`);if(n===null)continue;let r=document.createElement(`button`);r.type=`button`,r.textContent=`Save`;let i=document.createElement(`span`),a=document.createElement(`div`);a.className=`textfield-bar`,a.append(r,t,i),e.append(a);let o={path:new URL(`./${t}`,location.href).pathname,area:n,saved:n.value,status:i};X.push(o),n.addEventListener(`input`,()=>{i.textContent=n.value===o.saved?``:`nicht gespeichert`,i.classList.remove(`failed`)}),r.addEventListener(`click`,()=>{let e=n.value;fetch(`/__playground/save-text`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({page:location.pathname,file:t,source:e,loaded:o.saved})}).then(async t=>{if(t.ok)o.saved=e,i.textContent=`gespeichert`,i.classList.remove(`failed`);else{let e=await t.json();i.textContent=e.error??`Speichern fehlgeschlagen`,i.classList.add(`failed`)}})})}for(let e of document.querySelectorAll(`.quiz`)){let t=[...e.querySelectorAll(`.question`)],n=e.querySelector(`.quiz-result span`);e.querySelector(`.quiz-result button`)?.addEventListener(`click`,()=>{let e=0;for(let n of t){let t=!0,r=!1;for(let e of n.querySelectorAll(`input`)){let n=e.dataset.correct===`true`,i=e.closest(`.option`);i?.classList.toggle(`right`,e.checked&&n),i?.classList.toggle(`wrong`,e.checked&&!n),e.checked!==n&&(t=!1),e.checked&&n&&(r=!0)}n.classList.toggle(`right`,t),n.classList.toggle(`partial`,!t&&r),n.classList.toggle(`wrong`,!t&&!r),t&&(e+=1)}n!==null&&(n.textContent=`${e} von ${t.length} Fragen richtig`)});for(let e of t)e.addEventListener(`change`,()=>{for(let t of[e,...e.querySelectorAll(`.option`)])t.classList.remove(`right`,`partial`,`wrong`)})}for(let e of document.querySelectorAll(`.stepper`)){let t=e.dataset.stepper??``;try{let n=H[t];if(n===void 0)throw Error(`${t} nicht in config/stepper.ts gefunden`);n(e)}catch(n){console.error(`Step-through ${t}:`,n),e.replaceChildren(G(`Step-through konnte nicht gestartet werden: ${K(n).split(`
`)[0]}`))}}var Z=0;for(let e of document.querySelectorAll(`.demo`))Object.keys(W(e.dataset.demo??``)).length>0&&(Z+=1),Z<=z&&Y(e);Z>z&&document.querySelector(`main header`)?.after(G(`Diese Seite hat ${Z} WebGL-Demos, erlaubt sind höchstens ${z}.`));