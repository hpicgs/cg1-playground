const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./box-blur-cpu-DMCuZTu7.js","./lil-gui.esm-7jLSJ8mk.js","./flower-DR6y9MnS.js","./box-blur-gpu-DGQFL5wI.js","./gray-shader-xoMxLylG.js","./laplace-cpu-Du0MDob0.js","./laplace-gpu-t-TqHopo.js","./own-filter-C_ihDC5o.js"])))=>i.map(i=>d[i]);
import"./modulepreload-polyfill-P2Xu9kJm.js";import{_ as e,a as t,b as n,c as r,d as i,f as a,g as o,h as s,i as c,l,m as u,n as d,o as f,p,r as m,s as h,t as g,u as _,v,x as y,y as b}from"./preload-helper-oS5TvXPM.js";var x=`#version 300 es

// Box filter with radius r.

precision highp float;

uniform sampler2D image;
uniform vec2 size;
uniform int radius;

in vec2 uv;

out vec4 fragColor;

void main() {
    // TODO: implement your code here.
    fragColor = texture(image, uv);
}
`,S=`#version 300 es

// Two triangles that cover the drawn image. uv runs from (0, 0) at the top left to (1, 1) at
// the bottom right, like the pixel (i, j) on the CPU.

in vec2 position;

out vec2 uv;

void main() {
    uv = vec2(0.5 + 0.5 * position.x, 0.5 - 0.5 * position.y);
    gl_Position = vec4(position, 0.0, 1.0);
}
`,C=`#version 300 es

// Writes the BT.709 gray value of the input image.

precision highp float;

uniform sampler2D image;
uniform vec2 size;

in vec2 uv;

out vec4 fragColor;

void main() {
    // TODO: implement your code here.
    fragColor = texture(image, uv);
}
`,w=`#version 300 es

// Two triangles that cover the drawn image. uv runs from (0, 0) at the top left to (1, 1) at
// the bottom right, like the pixel (i, j) on the CPU.

in vec2 position;

out vec2 uv;

void main() {
    uv = vec2(0.5 + 0.5 * position.x, 0.5 - 0.5 * position.y);
    gl_Position = vec4(position, 0.0, 1.0);
}
`,T=`#version 300 es

// Laplace filter, shown as beta + alpha · L.

precision highp float;

uniform sampler2D image;
uniform vec2 size;
uniform float alpha;
uniform float beta;

in vec2 uv;

out vec4 fragColor;

void main() {
    // TODO: implement your code here.
    fragColor = texture(image, uv);
}
`,E=`#version 300 es

// Two triangles that cover the drawn image. uv runs from (0, 0) at the top left to (1, 1) at
// the bottom right, like the pixel (i, j) on the CPU.

in vec2 position;

out vec2 uv;

void main() {
    uv = vec2(0.5 + 0.5 * position.x, 0.5 - 0.5 * position.y);
    gl_Position = vec4(position, 0.0, 1.0);
}
`,D=`#version 300 es

// Your own filter.

precision highp float;

uniform sampler2D image;
uniform vec2 size;

in vec2 uv;

out vec4 fragColor;

void main() {
    // TODO: implement your code here.
    fragColor = texture(image, uv);
}
`,O=`#version 300 es

// Two triangles that cover the drawn image. uv runs from (0, 0) at the top left to (1, 1) at
// the bottom right, like the pixel (i, j) on the CPU.

in vec2 position;

out vec2 uv;

void main() {
    uv = vec2(0.5 + 0.5 * position.x, 0.5 - 0.5 * position.y);
    gl_Position = vec4(position, 0.0, 1.0);
}
`,k=y({steppers:()=>A}),A={"cpu-gpu":F},j=6,M=4,N=500,P={background:`#15171c`,empty:`#1d2027`,grid:`#2e333d`,done:`#5c9ded`,current:`#e0905c`,neighbourhood:`#d9dce2`,neighbourhoods:`rgb(217 220 226 / 0.45)`,text:`#d9dce2`};function F(e){let t=document.createElement(`canvas`),n=document.createElement(`button`);n.textContent=`Zurück`;let r=document.createElement(`button`);r.textContent=`Weiter`;let i=document.createElement(`button`);i.textContent=`Abspielen`;let a=document.createElement(`div`);a.className=`stepper-bar`,a.append(n,r,i);let o=document.createElement(`table`);o.className=`stepper-state`,o.innerHTML=`
        <tr><th>Schritt</th><th>CPU: fertige Pixel</th><th>GPU: fertige Pixel</th></tr>
        <tr><td></td><td></td><td></td></tr>`;let s=o.querySelectorAll(`td`);e.append(t,a,o);let c=0,l;n.addEventListener(`click`,()=>{u(),c=Math.max(0,c-1),d()}),r.addEventListener(`click`,()=>{u(),c=Math.min(48,c+1),d()}),i.addEventListener(`click`,()=>{l===void 0?(c===48&&(c=0),i.textContent=`Anhalten`,l=window.setInterval(()=>{c+=1,c===48&&u(),d()},N),d()):u()}),window.addEventListener(`resize`,d);function u(){window.clearInterval(l),l=void 0,i.textContent=`Abspielen`}function d(){let e=t.getContext(`2d`);if(e===null)return;let i=window.devicePixelRatio||1;t.width=Math.floor(t.clientWidth*i),t.height=Math.floor(t.clientHeight*i),e.setTransform(i,0,0,i,0,0);let a=t.clientWidth,o=t.clientHeight;e.fillStyle=P.background,e.fillRect(0,0,a,o);let l=Math.min((a-48)/2/j,(o-32-28)/M),u=a/2+8,d=Math.floor((c-1)/2),f=c>0&&(c-1)%2==0,p=f?d:Math.floor(c/2);I(e,`CPU: ein Pixel nach dem anderen`,16,16),L(e,16,44,l,e=>e<p?P.done:f&&e===d?P.current:P.empty),f&&R(e,16,44,l,d%j,Math.floor(d/j),P.neighbourhood);let m=c===1,h=c>=2?24:0;if(I(e,`GPU: alle Pixel zugleich`,u,16),L(e,u,44,l,()=>h>0?P.done:m?P.current:P.empty),m)for(let t=0;t<M;t++)for(let n=0;n<j;n++)R(e,u,44,l,n,t,P.neighbourhoods);s[0].textContent=`${c} von 48`,s[1].textContent=`${p} von 24`,s[2].textContent=`${h} von 24`,n.disabled=c===0,r.disabled=c===48}d()}function I(e,t,n,r){e.font=`15px system-ui, sans-serif`,e.textAlign=`left`,e.textBaseline=`middle`,e.fillStyle=P.text,e.fillText(t,n,r+10)}function L(e,t,n,r,i){for(let a=0;a<M;a++)for(let o=0;o<j;o++)e.fillStyle=i(a*j+o),e.fillRect(t+o*r,n+a*r,r,r),e.strokeStyle=P.grid,e.strokeRect(t+o*r+.5,n+a*r+.5,r-1,r-1)}function R(e,t,n,r,i,a,o){let s=r/10,c=Math.max(0,i-1),l=Math.max(0,a-1),u=Math.min(5,i+1),d=Math.min(3,a+1);e.strokeStyle=o,e.lineWidth=3,e.strokeRect(t+c*r+s,n+l*r+s,(u-c+1)*r-2*s,(d-l+1)*r-2*s),e.lineWidth=1}var z={"#404740":`#949aa6`,"#708":`#c792ea`,"#219":`#82aaff`,"#164":`#f78c6c`,"#a11":`#c3e88d`,"#e40":`#ffcb6b`,"#00f":`#82aaff`,"#30a":`#d9dce2`,"#085":`#4fb8b8`,"#167":`#ffcb6b`,"#256":`#c792ea`,"#00c":`#82aaff`,"#940":`#7f8796`,"#f00":`#ff6b6b`},B=r.define(_.specs.map(e=>({...e,color:typeof e.color==`string`?z[e.color]??e.color:void 0}))),V=u.theme({"&":{height:`100%`,backgroundColor:`var(--surface)`,color:`var(--text)`},".cm-scroller":{fontFamily:`ui-monospace, monospace`,fontSize:`0.8rem`},".cm-content":{caretColor:`var(--text)`},".cm-gutters":{backgroundColor:`var(--surface)`,color:`var(--muted)`,border:`none`},".cm-activeLine, .cm-activeLineGutter":{backgroundColor:`#ffffff0a`},"&.cm-focused .cm-selectionBackground, .cm-selectionBackground":{backgroundColor:`#3a4252`},".cm-error-line":{backgroundColor:`color-mix(in srgb, var(--error) 22%, transparent)`}},{dark:!0}),H=b.define(),U=n.define({create:()=>p.none,update(e,t){for(let e of t.effects)if(e.is(H)){let n=t.state.doc,r=e.value.filter(e=>e>=1&&e<=n.lines).map(e=>p.line({class:`cm-error-line`}).range(n.line(e).from));return p.set(r,!0)}return t.docChanged?p.none:e},provide:e=>u.decorations.from(e)});function W(e){return e===`glsl`||/\.(vert|frag)$/.test(e)?d():[`ts`,`typescript`,`js`,`javascript`].includes(e)?m({typescript:!0}):[]}function G(){for(let e of document.querySelectorAll(`pre.listing`)){let t=new u({doc:(e.textContent??``).replace(/\n$/,``),extensions:[V,a(B),v.readOnly.of(!0),u.editable.of(!1),W(e.dataset.language??``)]});t.dom.classList.add(`listing`),e.replaceWith(t.dom)}}function K(n,r,d,p,m){let g=document.createElement(`div`);g.className=`editor-header`;let _=document.createElement(`div`);_.className=`editor-tabs`;let v=document.createElement(`button`);v.className=`editor-save`,v.textContent=`Save`;let y=document.createElement(`button`);y.className=`editor-run`,y.textContent=`Run`,g.append(_,v,y);let b=document.createElement(`div`);b.className=`editor-code`;let x=document.createElement(`pre`);x.className=`editor-log`,n.append(g,b,x);let S=``;function C(e,t){x.textContent=S===``?e:`${S}\n${e}`,x.classList.toggle(`failed`,t),S=``}let w={},T={};for(let n of d){let r=p[n]??``;T[n]=r.replaceAll(`\r
`,`
`);let d=document.createElement(`div`);d.className=`editor-file`,b.append(d),w[n]=new u({doc:r,parent:d,extensions:[V,e(),s(),t(),i(),l(),a(B),o.of([...c,...f,h]),W(n),U]});let m=document.createElement(`button`);m.textContent=n,m.addEventListener(`click`,()=>E(n)),_.append(m)}function E(e){d.forEach((t,n)=>{b.children[n].toggleAttribute(`hidden`,t!==e),_.children[n].classList.toggle(`active`,t===e)})}d.length>0&&E(d[0]);function D(){let e={};for(let t of d)e[t]=w[t].state.doc.toString();return e}async function O(){for(let e of d){let t=w[e].state.doc.toString();if(t===T[e])continue;let n=await fetch(`/__playground/save`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({page:location.pathname,demo:r,file:e,source:t,loaded:T[e]})});if(!n.ok)return C(`${e}: ${(await n.json()).error??`Speichern fehlgeschlagen`}`,!0),!1;T[e]=t}return C(`Gespeichert.`,!1),!0}return v.addEventListener(`click`,()=>void O()),y.addEventListener(`click`,()=>{O().then(e=>{e&&m(D())})}),{setSource(e,t){let n=w[e];if(n===void 0)return!0;let r=t.replaceAll(`\r
`,`
`);if(r===T[e])return!1;let i=n.state.doc.toString()!==T[e];return n.dispatch({changes:{from:0,to:n.state.doc.length,insert:r}}),T[e]=r,S=i?`${e} wurde in der IDE geändert und neu geladen; deine ungespeicherten Änderungen sind verworfen.`:`${e} wurde in der IDE geändert und neu geladen.`,!0},showLog(e,t){C(e,t);for(let n of d){let r=[];t&&e.includes(`${n}:`)&&(r=[...e.matchAll(/ERROR: \d+:(\d+):/g)].map(e=>Number(e[1]))),w[n].dispatch({effects:H.of(r)})}}}}var q=12,J=Object.assign({"../src/box-blur-cpu/index.ts":()=>g(()=>import(`./box-blur-cpu-DMCuZTu7.js`),__vite__mapDeps([0,1,2]),import.meta.url),"../src/box-blur-gpu/index.ts":()=>g(()=>import(`./box-blur-gpu-DGQFL5wI.js`),__vite__mapDeps([3,1,2]),import.meta.url),"../src/gray-shader/index.ts":()=>g(()=>import(`./gray-shader-xoMxLylG.js`),__vite__mapDeps([4,1,2]),import.meta.url),"../src/laplace-cpu/index.ts":()=>g(()=>import(`./laplace-cpu-Du0MDob0.js`),__vite__mapDeps([5,1,2]),import.meta.url),"../src/laplace-gpu/index.ts":()=>g(()=>import(`./laplace-gpu-t-TqHopo.js`),__vite__mapDeps([6,1,2]),import.meta.url),"../src/own-filter/index.ts":()=>g(()=>import(`./own-filter-C_ihDC5o.js`),__vite__mapDeps([7,1,2]),import.meta.url)}),ee=Object.assign({"../src/box-blur-gpu/box-blur.frag":x,"../src/box-blur-gpu/quad.vert":S,"../src/gray-shader/gray.frag":C,"../src/gray-shader/quad.vert":w,"../src/laplace-gpu/laplace.frag":T,"../src/laplace-gpu/quad.vert":E,"../src/own-filter/filter.frag":D,"../src/own-filter/quad.vert":O}),te=Object.assign({"./stepper.ts":k})[`./stepper.ts`]?.steppers??{},ne=[];function Y(e){let t={};for(let[n,r]of Object.entries(ee))n.startsWith(`../src/${e}/`)&&(t[n.slice(`../src/${e}/`.length)]=r);return t}function X(e){let t=document.createElement(`div`);return t.className=`demo-error`,t.textContent=e,t}function Z(e){return e instanceof Error?e.message:String(e)}function re(e){if(e.module?.rebuild===void 0)Q(e);else try{e.module.rebuild(e.sources),e.editor?.showLog(`Kompiliert.`,!1)}catch(t){console.error(`Demo ${e.name}:`,t),e.editor?.showLog(Z(t),!0)}}async function Q(e){let t=document.createElement(`canvas`),n=document.createElement(`div`);n.className=`controls`,e.view.replaceChildren(t,n),e.module=void 0;try{let r=J[`../src/${e.name}/index.ts`];if(r===void 0)throw Error(`src/${e.name}/index.ts nicht gefunden`);let i=await r();await i.start(t,n,e.sources),e.module=i,i.setVisible?.(e.visible),e.editor?.showLog(``,!1)}catch(t){console.error(`Demo ${e.name}:`,t);let n=Z(t);e.view.replaceChildren(X(`Demo konnte nicht gestartet werden: ${n.split(`
`)[0]}`)),e.editor?.showLog(n,!0)}}function ie(e){let t=e.dataset.demo??``,n=(e.dataset.files??``).split(`,`).filter(e=>e!==``).sort((e,t)=>Number(e.endsWith(`.frag`))-Number(t.endsWith(`.frag`))),r=document.createElement(`div`);r.className=`demo-view`;let i=document.createElement(`button`);i.className=`fullscreen`,i.textContent=`Vollbild`,i.addEventListener(`click`,()=>{document.fullscreenElement===e?document.exitFullscreen():e.requestFullscreen()}),e.append(r,i);let a={name:t,path:new URL(`./src/${t}/`,location.href).pathname,view:r,sources:Y(t),module:void 0,editor:void 0,visible:!1};if(ne.push(a),new IntersectionObserver(e=>{for(let t of e)a.visible=t.isIntersecting,a.module?.setVisible?.(a.visible)}).observe(e),n.length>0){let r=document.createElement(`div`);r.className=`editor`,e.classList.add(`has-editor`),e.prepend(r),a.editor=K(r,t,n,a.sources,e=>{a.sources={...a.sources,...e},re(a)})}Q(a)}G();for(let e of document.querySelectorAll(`.copy-path`))e.addEventListener(`click`,()=>{navigator.clipboard.writeText(e.dataset.path??``).then(()=>{e.classList.add(`copied`),setTimeout(()=>e.classList.remove(`copied`),1500)})});var ae=[];for(let e of document.querySelectorAll(`.textfield`)){let t=e.dataset.file??``,n=e.querySelector(`textarea`);if(n===null)continue;let r=document.createElement(`button`);r.type=`button`,r.textContent=`Save`;let i=document.createElement(`span`),a=document.createElement(`div`);a.className=`textfield-bar`,a.append(r,t,i),e.append(a);let o={path:new URL(`./${t}`,location.href).pathname,area:n,saved:n.value,status:i};ae.push(o),n.addEventListener(`input`,()=>{i.textContent=n.value===o.saved?``:`nicht gespeichert`,i.classList.remove(`failed`)}),r.addEventListener(`click`,()=>{let e=n.value;fetch(`/__playground/save-text`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({page:location.pathname,file:t,source:e,loaded:o.saved})}).then(async t=>{if(t.ok)o.saved=e,i.textContent=`gespeichert`,i.classList.remove(`failed`);else{let e=await t.json();i.textContent=e.error??`Speichern fehlgeschlagen`,i.classList.add(`failed`)}})})}for(let e of document.querySelectorAll(`.quiz`)){let t=[...e.querySelectorAll(`.question`)],n=e.querySelector(`.quiz-result span`);e.querySelector(`.quiz-result button`)?.addEventListener(`click`,()=>{let e=0;for(let n of t){let t=!0,r=!1;for(let e of n.querySelectorAll(`input`)){let n=e.dataset.correct===`true`,i=e.closest(`.option`);i?.classList.toggle(`right`,e.checked&&n),i?.classList.toggle(`wrong`,e.checked&&!n),e.checked!==n&&(t=!1),e.checked&&n&&(r=!0)}n.classList.toggle(`right`,t),n.classList.toggle(`partial`,!t&&r),n.classList.toggle(`wrong`,!t&&!r),t&&(e+=1)}n!==null&&(n.textContent=`${e} von ${t.length} Fragen richtig`)});for(let e of t)e.addEventListener(`change`,()=>{for(let t of[e,...e.querySelectorAll(`.option`)])t.classList.remove(`right`,`partial`,`wrong`)})}for(let e of document.querySelectorAll(`.stepper`)){let t=e.dataset.stepper??``;try{let n=te[t];if(n===void 0)throw Error(`${t} nicht in config/stepper.ts gefunden`);n(e)}catch(n){console.error(`Step-through ${t}:`,n),e.replaceChildren(X(`Step-through konnte nicht gestartet werden: ${Z(n).split(`
`)[0]}`))}}var $=0;for(let e of document.querySelectorAll(`.demo`))Object.keys(Y(e.dataset.demo??``)).length>0&&($+=1),$<=q&&ie(e);$>q&&document.querySelector(`main header`)?.after(X(`Diese Seite hat ${$} WebGL-Demos, erlaubt sind höchstens ${q}.`));