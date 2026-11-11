const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./aliasing-DYbiSELm.js","./lil-gui.esm-7jLSJ8mk.js","./multisampling-DWphNj2t.js","./supersampling-ChtAI4Mb.js"])))=>i.map(i=>d[i]);
import"./modulepreload-polyfill-P2Xu9kJm.js";import{_ as e,a as t,b as n,c as r,d as i,f as a,g as o,h as s,i as c,l,m as u,n as d,o as ee,p as f,r as p,s as m,t as h,u as g,v as _,x as v,y}from"./preload-helper-oS5TvXPM.js";var b=`#version 300 es

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
`,x=`#version 300 es

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
`,S=`#version 300 es

// Runs once for every fragment of the triangle: the triangle is white.

precision highp float;

out vec4 fragColor;

void main() {
    fragColor = vec4(1.0, 1.0, 1.0, 1.0);
}
`,C=`#version 300 es

// Runs once per corner. position is in pixel coordinates of the raster: x to the right, y down,
// (0, 0) at the top left.

in vec2 position;

uniform vec2 size;

void main() {
    // From pixel coordinates to NDC; y is turned around, because it points up in NDC.
    float x = 2.0 * position.x / size.x - 1.0;
    float y = 1.0 - 2.0 * position.y / size.y;
    gl_Position = vec4(x, y, 0.0, 1.0);
}
`,w=`#version 300 es

// Two triangles that cover the whole viewport.

in vec2 position;

void main() {
    gl_Position = vec4(position, 0.0, 1.0);
}
`,T=`#version 300 es

// Runs once for every fragment. The thin rectangle is white. The background draws the second line
// itself: a fragment is white if it lies at most half the line width away from the line segment.

precision highp float;

in vec2 local;

// Whether this draw is the background with the line from the shader.
uniform bool shaderLine;
// The line segment and its width, in pixel coordinates of the raster.
uniform vec2 lineStart;
uniform vec2 lineEnd;
uniform float lineWidth;

out vec4 fragColor;

void main() {
    float value = 1.0;
    if (shaderLine) {
        vec2 along = lineEnd - lineStart;
        vec2 offset = local - lineStart;
        // How far along the segment (0 to 1) and how far from it the fragment is.
        float t = dot(offset, along) / dot(along, along);
        float distance = abs(offset.x * along.y - offset.y * along.x) / length(along);
        value = t >= 0.0 && t <= 1.0 && distance <= 0.5 * lineWidth ? 1.0 : 0.0;
    }
    fragColor = vec4(vec3(value), 1.0);
}
`,E=`#version 300 es

// Runs once per corner. position is in pixel coordinates of the raster: x to the right, y down,
// (0, 0) at the top left.

in vec2 position;

uniform vec2 size;

// The position in pixel coordinates of the raster, for the line that the shader draws.
out vec2 local;

void main() {
    local = position;

    // From pixel coordinates to NDC; y is turned around, because it points up in NDC.
    float x = 2.0 * position.x / size.x - 1.0;
    float y = 1.0 - 2.0 * position.y / size.y;
    gl_Position = vec4(x, y, 0.0, 1.0);
}
`,D=`#version 300 es

// One colour for every fragment.

precision highp float;

uniform vec3 color;

out vec4 fragColor;

void main() {
    fragColor = vec4(color, 1.0);
}
`,O=`#version 300 es

// The lines of the pixel grid, in pixel coordinates of the raster (y down).

in vec2 position;

uniform vec2 size;

void main() {
    float x = 2.0 * position.x / size.x - 1.0;
    float y = 1.0 - 2.0 * position.y / size.y;
    gl_Position = vec4(x, y, 0.0, 1.0);
}
`,k=`#version 300 es

// Two triangles that cover the whole viewport.

in vec2 position;

void main() {
    gl_Position = vec4(position, 0.0, 1.0);
}
`,A=`#version 300 es

// Runs once for every pixel of the raster and writes its colour from the pixel's samples.

precision highp float;

// The samples: the triangle rasterized with n × n texels for every pixel of the raster.
uniform sampler2D samples;
uniform int n;

out vec4 fragColor;

void main() {
    // The first of the n × n texels that belong to this pixel.
    ivec2 first = ivec2(gl_FragCoord.xy) * n;

    // TODO: implement your code here.
    fragColor = texelFetch(samples, first + n / 2, 0);
}
`,j=`#version 300 es

// Shows the samples enlarged: white inside the triangle, gray outside. With dots, each sample is
// a square dot with a black gap of one device pixel on two sides.

precision highp float;

uniform sampler2D samples;

// The bottom left corner of the view in device pixels, the device pixels per sample and whether
// the samples are drawn as dots.
uniform vec2 origin;
uniform float scale;
uniform bool dots;

out vec4 fragColor;

// The colours of a sample outside and inside the triangle.
const vec3 outside = vec3(0.3);
const vec3 inside = vec3(1.0);

void main() {
    vec2 local = gl_FragCoord.xy - origin;
    float value = texelFetch(samples, ivec2(local / scale), 0).r;
    vec3 color = mix(outside, inside, value);

    vec2 within = mod(floor(local), scale);
    if (dots && (within.x >= scale - 1.0 || within.y >= scale - 1.0)) {
        color = vec3(0.0);
    }
    fragColor = vec4(color, 1.0);
}
`,M=`#version 300 es

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
`,N=`#version 300 es

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
`,te=`#version 300 es

// Runs once for every fragment of the triangle: the triangle is white.

precision highp float;

out vec4 fragColor;

void main() {
    fragColor = vec4(1.0, 1.0, 1.0, 1.0);
}
`,ne=`#version 300 es

// Runs once per corner. position is in pixel coordinates of the raster: x to the right, y down,
// (0, 0) at the top left.

in vec2 position;

uniform vec2 size;

void main() {
    // From pixel coordinates to NDC; y is turned around, because it points up in NDC.
    float x = 2.0 * position.x / size.x - 1.0;
    float y = 1.0 - 2.0 * position.y / size.y;
    gl_Position = vec4(x, y, 0.0, 1.0);
}
`,P=v({steppers:()=>F}),F={},I={"#404740":`#949aa6`,"#708":`#c792ea`,"#219":`#82aaff`,"#164":`#f78c6c`,"#a11":`#c3e88d`,"#e40":`#ffcb6b`,"#00f":`#82aaff`,"#30a":`#d9dce2`,"#085":`#4fb8b8`,"#167":`#ffcb6b`,"#256":`#c792ea`,"#00c":`#82aaff`,"#940":`#7f8796`,"#f00":`#ff6b6b`},L=r.define(g.specs.map(e=>({...e,color:typeof e.color==`string`?I[e.color]??e.color:void 0}))),R=u.theme({"&":{height:`100%`,backgroundColor:`var(--surface)`,color:`var(--text)`},".cm-scroller":{fontFamily:`ui-monospace, monospace`,fontSize:`0.8rem`},".cm-content":{caretColor:`var(--text)`},".cm-gutters":{backgroundColor:`var(--surface)`,color:`var(--muted)`,border:`none`},".cm-activeLine, .cm-activeLineGutter":{backgroundColor:`#ffffff0a`},"&.cm-focused .cm-selectionBackground, .cm-selectionBackground":{backgroundColor:`#3a4252`},".cm-error-line":{backgroundColor:`color-mix(in srgb, var(--error) 22%, transparent)`}},{dark:!0}),z=y.define(),B=n.define({create:()=>f.none,update(e,t){for(let e of t.effects)if(e.is(z)){let n=t.state.doc,r=e.value.filter(e=>e>=1&&e<=n.lines).map(e=>f.line({class:`cm-error-line`}).range(n.line(e).from));return f.set(r,!0)}return t.docChanged?f.none:e},provide:e=>u.decorations.from(e)});function V(e){return e===`glsl`||/\.(vert|frag)$/.test(e)?d():[`ts`,`typescript`,`js`,`javascript`].includes(e)?p({typescript:!0}):[]}function H(){for(let e of document.querySelectorAll(`pre.listing`)){let t=new u({doc:(e.textContent??``).replace(/\n$/,``),extensions:[R,a(L),_.readOnly.of(!0),u.editable.of(!1),V(e.dataset.language??``)]});t.dom.classList.add(`listing`),e.replaceWith(t.dom)}}function U(n,r,d,f,p){let h=document.createElement(`div`);h.className=`editor-header`;let g=document.createElement(`div`);g.className=`editor-tabs`;let _=document.createElement(`button`);_.className=`editor-save`,_.textContent=`Save`;let v=document.createElement(`button`);v.className=`editor-run`,v.textContent=`Run`,h.append(g,_,v);let y=document.createElement(`div`);y.className=`editor-code`;let b=document.createElement(`pre`);b.className=`editor-log`,n.append(h,y,b);let x=``;function S(e,t){b.textContent=x===``?e:`${x}\n${e}`,b.classList.toggle(`failed`,t),x=``}let C={},w={};for(let n of d){let r=f[n]??``;w[n]=r.replaceAll(`\r
`,`
`);let d=document.createElement(`div`);d.className=`editor-file`,y.append(d),C[n]=new u({doc:r,parent:d,extensions:[R,e(),s(),t(),i(),l(),a(L),o.of([...c,...ee,m]),V(n),B]});let p=document.createElement(`button`);p.textContent=n,p.addEventListener(`click`,()=>T(n)),g.append(p)}function T(e){d.forEach((t,n)=>{y.children[n].toggleAttribute(`hidden`,t!==e),g.children[n].classList.toggle(`active`,t===e)})}d.length>0&&T(d[0]);function E(){let e={};for(let t of d)e[t]=C[t].state.doc.toString();return e}async function D(){for(let e of d){let t=C[e].state.doc.toString();if(t===w[e])continue;let n=await fetch(`/__playground/save`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({page:location.pathname,demo:r,file:e,source:t,loaded:w[e]})});if(!n.ok)return S(`${e}: ${(await n.json()).error??`Speichern fehlgeschlagen`}`,!0),!1;w[e]=t}return S(`Gespeichert.`,!1),!0}return _.addEventListener(`click`,()=>void D()),v.addEventListener(`click`,()=>{D().then(e=>{e&&p(E())})}),{setSource(e,t){let n=C[e];if(n===void 0)return!0;let r=t.replaceAll(`\r
`,`
`);if(r===w[e])return!1;let i=n.state.doc.toString()!==w[e];return n.dispatch({changes:{from:0,to:n.state.doc.length,insert:r}}),w[e]=r,x=i?`${e} wurde in der IDE geändert und neu geladen; deine ungespeicherten Änderungen sind verworfen.`:`${e} wurde in der IDE geändert und neu geladen.`,!0},showLog(e,t){S(e,t);for(let n of d){let r=[];t&&e.includes(`${n}:`)&&(r=[...e.matchAll(/ERROR: \d+:(\d+):/g)].map(e=>Number(e[1]))),C[n].dispatch({effects:z.of(r)})}}}}var W=12,G=Object.assign({"../src/aliasing/index.ts":()=>h(()=>import(`./aliasing-DYbiSELm.js`),__vite__mapDeps([0,1]),import.meta.url),"../src/multisampling/index.ts":()=>h(()=>import(`./multisampling-DWphNj2t.js`),__vite__mapDeps([2,1]),import.meta.url),"../src/solution/index.ts":()=>h(()=>import(`./solution-NjlRmvhS.js`),[],import.meta.url),"../src/supersampling/index.ts":()=>h(()=>import(`./supersampling-ChtAI4Mb.js`),__vite__mapDeps([3,1]),import.meta.url)}),K=Object.assign({"../src/aliasing/shape.frag":b,"../src/aliasing/shape.vert":x,"../src/aliasing/triangle.frag":S,"../src/aliasing/triangle.vert":C,"../src/multisampling/quad.vert":w,"../src/multisampling/scene.frag":T,"../src/multisampling/scene.vert":E,"../src/multisampling/shape.frag":D,"../src/multisampling/shape.vert":O,"../src/supersampling/quad.vert":k,"../src/supersampling/resolve.frag":A,"../src/supersampling/samples.frag":j,"../src/supersampling/shape.frag":M,"../src/supersampling/shape.vert":N,"../src/supersampling/triangle.frag":te,"../src/supersampling/triangle.vert":ne}),q=Object.assign({"./stepper.ts":P})[`./stepper.ts`]?.steppers??{},J=[];function Y(e){let t={};for(let[n,r]of Object.entries(K))n.startsWith(`../src/${e}/`)&&(t[n.slice(`../src/${e}/`.length)]=r);return t}function X(e){let t=document.createElement(`div`);return t.className=`demo-error`,t.textContent=e,t}function Z(e){return e instanceof Error?e.message:String(e)}function re(e){if(e.module?.rebuild===void 0)Q(e);else try{e.module.rebuild(e.sources),e.editor?.showLog(`Kompiliert.`,!1)}catch(t){console.error(`Demo ${e.name}:`,t),e.editor?.showLog(Z(t),!0)}}async function Q(e){let t=document.createElement(`canvas`),n=document.createElement(`div`);n.className=`controls`,e.view.replaceChildren(t,n),e.module=void 0;try{let r=G[`../src/${e.name}/index.ts`];if(r===void 0)throw Error(`src/${e.name}/index.ts nicht gefunden`);let i=await r();await i.start(t,n,e.sources),e.module=i,i.setVisible?.(e.visible),e.editor?.showLog(``,!1)}catch(t){console.error(`Demo ${e.name}:`,t);let n=Z(t);e.view.replaceChildren(X(`Demo konnte nicht gestartet werden: ${n.split(`
`)[0]}`)),e.editor?.showLog(n,!0)}}function ie(e){let t=e.dataset.demo??``,n=(e.dataset.files??``).split(`,`).filter(e=>e!==``).sort((e,t)=>Number(e.endsWith(`.frag`))-Number(t.endsWith(`.frag`))),r=document.createElement(`div`);r.className=`demo-view`;let i=document.createElement(`button`);i.className=`fullscreen`,i.textContent=`Vollbild`,i.addEventListener(`click`,()=>{document.fullscreenElement===e?document.exitFullscreen():e.requestFullscreen()}),e.append(r,i);let a={name:t,path:new URL(`./src/${t}/`,location.href).pathname,view:r,sources:Y(t),module:void 0,editor:void 0,visible:!1};if(J.push(a),new IntersectionObserver(e=>{for(let t of e)a.visible=t.isIntersecting,a.module?.setVisible?.(a.visible)}).observe(e),n.length>0){let r=document.createElement(`div`);r.className=`editor`,e.classList.add(`has-editor`),e.prepend(r),a.editor=U(r,t,n,a.sources,e=>{a.sources={...a.sources,...e},re(a)})}Q(a)}H();for(let e of document.querySelectorAll(`.copy-path`))e.addEventListener(`click`,()=>{navigator.clipboard.writeText(e.dataset.path??``).then(()=>{e.classList.add(`copied`),setTimeout(()=>e.classList.remove(`copied`),1500)})});var ae=[];for(let e of document.querySelectorAll(`.textfield`)){let t=e.dataset.file??``,n=e.querySelector(`textarea`);if(n===null)continue;let r=document.createElement(`button`);r.type=`button`,r.textContent=`Save`;let i=document.createElement(`span`),a=document.createElement(`div`);a.className=`textfield-bar`,a.append(r,t,i),e.append(a);let o={path:new URL(`./${t}`,location.href).pathname,area:n,saved:n.value,status:i};ae.push(o),n.addEventListener(`input`,()=>{i.textContent=n.value===o.saved?``:`nicht gespeichert`,i.classList.remove(`failed`)}),r.addEventListener(`click`,()=>{let e=n.value;fetch(`/__playground/save-text`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({page:location.pathname,file:t,source:e,loaded:o.saved})}).then(async t=>{if(t.ok)o.saved=e,i.textContent=`gespeichert`,i.classList.remove(`failed`);else{let e=await t.json();i.textContent=e.error??`Speichern fehlgeschlagen`,i.classList.add(`failed`)}})})}for(let e of document.querySelectorAll(`.quiz`)){let t=[...e.querySelectorAll(`.question`)],n=e.querySelector(`.quiz-result span`);e.querySelector(`.quiz-result button`)?.addEventListener(`click`,()=>{let e=0;for(let n of t){let t=!0,r=!1;for(let e of n.querySelectorAll(`input`)){let n=e.dataset.correct===`true`,i=e.closest(`.option`);i?.classList.toggle(`right`,e.checked&&n),i?.classList.toggle(`wrong`,e.checked&&!n),e.checked!==n&&(t=!1),e.checked&&n&&(r=!0)}n.classList.toggle(`right`,t),n.classList.toggle(`partial`,!t&&r),n.classList.toggle(`wrong`,!t&&!r),t&&(e+=1)}n!==null&&(n.textContent=`${e} von ${t.length} Fragen richtig`)});for(let e of t)e.addEventListener(`change`,()=>{for(let t of[e,...e.querySelectorAll(`.option`)])t.classList.remove(`right`,`partial`,`wrong`)})}for(let e of document.querySelectorAll(`.stepper`)){let t=e.dataset.stepper??``;try{let n=q[t];if(n===void 0)throw Error(`${t} nicht in config/stepper.ts gefunden`);n(e)}catch(n){console.error(`Step-through ${t}:`,n),e.replaceChildren(X(`Step-through konnte nicht gestartet werden: ${Z(n).split(`
`)[0]}`))}}var $=0;for(let e of document.querySelectorAll(`.demo`))Object.keys(Y(e.dataset.demo??``)).length>0&&($+=1),$<=W&&ie(e);$>W&&document.querySelector(`main header`)?.after(X(`Diese Seite hat ${$} WebGL-Demos, erlaubt sind höchstens ${W}.`));export{A as t};