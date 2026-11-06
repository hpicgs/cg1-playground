\begin{goals}
- Den Weg eines Eckpunkts vom Vertex-Array über den Vertex-Shader bis zu den Fragmenten nachvollziehen.
- Mit baryzentrischen Koordinaten beschreiben, wo ein Pixelzentrum relativ zu einem Dreieck liegt.
- Eckattribute mit `out` und `in` an den Fragment-Shader übergeben und ihre Interpolation erklären.
- Mit Edge Functions bestimmen, auf welcher Seite einer Kante ein Punkt liegt, und daraus baryzentrische Koordinaten berechnen.
- Ein Dreieck selbst rasterisieren.
\end{goals}

\begin{prerequisites}
Kapitel 3 der Vorlesung, vor allem die Dreiecksrasterisierung mit baryzentrischen Koordinaten und Edge Function Testing und die OpenGL-Rasterisierungspipeline. Aus Kapitel 1 das „Hello, World!“ für WebGL. Die Übung „Bildfilter auf CPU und GPU“ für den Einstieg in Fragment-Shader.

Weiterführend: die [Kurzreferenz zu OpenGL ES 3.0](https://www.khronos.org/files/opengles3-quick-reference-card.pdf) mit GLSL ES 3.00 auf den letzten Seiten.
\end{prerequisites}

## Vom Eckpunkt zum Pixel

Das „Hello, World!“ für WebGL in Kapitel 1 zeichnet ein Dreieck, dessen Eckpunkte eine Position $(x, y)$ und eine Farbe $(r, g, b)$ haben. Die Eckpunkte liegen hintereinander in einem Vertex-Array, fünf Floats pro Eckpunkt. Ein Float hat 4 Bytes, ein Eintrag ist also $(2 + 3) \cdot 4 = 20$ Bytes lang (stride). `vertexAttribPointer` gibt für jedes Eckattribut an, wie viele Zahlen es hat und ab welchem Byte eines Eintrags es steht:

```ts
const vertices = new Float32Array([
    // x, y, r, g, b
    4, 3, 1, 0, 0,
    27, 6, 0, 1, 0,
    11, 16, 0, 0, 1,
]);
const stride = (2 + 3) * 4;
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);
gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, stride, 2 * 4);
gl.drawArrays(gl.TRIANGLES, 0, 3);
```

Der Vertex-Shader läuft einmal für jeden Eckpunkt. Seine `in`-Variablen enthalten die Eckattribute dieses Eckpunkts, und in `gl_Position` gibt er an, wo der Eckpunkt liegt, in normalisierten Gerätekoordinaten (NDC), in denen die Canvas von $-1$ bis $1$ reicht (Kapitel 3, Canvas & Viewport). Auf dieser Seite werden Punkte in Pixelkoordinaten $(x, y)$ eines Rasters angegeben, mit $(0, 0)$ in der linken oberen Ecke wie in der Übung „Graustufen und Dithering“; der Vertex-Shader rechnet sie in NDC um.

Danach bestimmt die GPU, welche Pixel das Dreieck darstellen. Pixel $(i, j)$ ist das Quadrat von $(i, j)$ bis $(i + 1, j + 1)$, und es gehört zum Dreieck, wenn sein Pixelzentrum $(i + 0.5, j + 0.5)$ im Dreieck liegt (Kapitel 3, Dreiecksrasterisierung – Beispiel-Implementierung). Das Dreieck wird also nur an den Pixelzentren abgetastet. Für jedes Pixel, das dazugehört, entsteht ein Fragment, und für jedes Fragment läuft einmal der Fragment-Shader. Er berechnet die Farbe des Fragments oder verwirft es (Kapitel 3, OpenGL-Rasterisierungspipeline); nach `discard;` schreibt er nichts ins Raster.

Wo ein Punkt $p$ relativ zum Dreieck $\{v_0, v_1, v_2\}$ liegt, beschreiben seine baryzentrischen Koordinaten $(\alpha, \beta, \gamma)$ (Kapitel 3, Dreiecke – Baryzentrische Koordinaten). Sie sind die Gewichte, mit denen sich $p$ aus den Eckpunkten zusammensetzt:

$$
p = \alpha\,v_0 + \beta\,v_1 + \gamma\,v_2, \qquad \alpha + \beta + \gamma = 1.
$$

Im Inneren des Dreiecks liegen alle drei zwischen 0 und 1, auf einer Kante ist eine von ihnen 0, an einem Eckpunkt ist eine 1 und die anderen sind 0, und außerhalb ist mindestens eine negativ. Ob ein Pixelzentrum im Dreieck liegt, ist also eine Frage nach den Vorzeichen seiner baryzentrischen Koordinaten.

\begin{webgl}
In der Vorlesung zeigt $y$ nach oben (Kapitel 3, Canvas & Viewport). Auf dieser Seite zeigt $y$ wie in der Übung „Graustufen und Dithering“ und auf dem Bildschirm nach unten. `raster.vert` dreht $y$ deshalb um, wenn es Pixelkoordinaten in NDC umrechnet.

Kapitel 3 benutzt $\alpha$, $\beta$ und $\gamma$ auch für die Koeffizienten einer Geradengleichung. Auf dieser Seite stehen sie nur für die baryzentrischen Koordinaten.
\end{webgl}

\begin{note}[Über die Vorlesung hinaus: Framebuffer]
Ein Framebuffer ist ein Raster, in das die GPU statt auf die Canvas zeichnen kann; Kapitel 3 nennt Framebuffer als eines der Ausgaberaster, in die eine GPU rasterisieren kann. Er hat eine eigene Größe in Pixeln, unabhängig von der Canvas. `blitFramebuffer` kopiert seinen Inhalt auf die Canvas, auch vergrößert und dann wahlweise mit oder ohne Interpolation.

Auf einer Canvas sind die Pixel zu klein, um einzelne zu erkennen. Die erste Demo rasterisiert deshalb in einen Framebuffer aus $32 \times 18$ Pixeln und kopiert ihn vergrößert und ohne Interpolation auf die Canvas. Gitter, Pixelzentren und Umriss werden erst danach in voller Auflösung darübergezeichnet.
\end{note}

Die Demo zeigt ein Dreieck auf diesem Raster; die Punkte sind die Pixelzentren, und gefärbt sind die Pixel, für die ein Fragment entsteht. Die Ecken lassen sich rechts eingeben oder mit der Maus ziehen, und für das Pixel unter der Maus stehen rechts die baryzentrischen Koordinaten seines Zentrums und seine Bytes.

\demo{raster}[raster.vert, raster.frag]

\begin{task}[Pixel und baryzentrische Koordinaten]
1. Setze die Ecken auf $v_0 = (1.5, 1.5)$, $v_1 = (17.5, 1.5)$ und $v_2 = (1.5, 17.5)$. Berechne aus $p = \alpha\,v_0 + \beta\,v_1 + \gamma\,v_2$ die baryzentrischen Koordinaten der Zentren der Pixel $(5, 7)$ und $(13, 5)$, und prüfe mit „α, β, γ“.
2. Welche Koordinate ist am Zentrum von Pixel $(10, 9)$ negativ, und warum gerade diese?
3. Verschiebe die Ecken so, dass das Dreieck eine Fläche hat, aber kein Pixel grau wird. Wie oft laufen dann der Vertex-Shader und der Fragment-Shader, und warum?
\end{task}

## Eckattribute interpolieren

Mit den baryzentrischen Koordinaten werden auch Eckattribute interpoliert, zum Beispiel die Farben $c_0, c_1, c_2$ der Eckpunkte:

$$
c = \alpha\,c_0 + \beta\,c_1 + \gamma\,c_2.
$$

Das übernimmt die GPU zwischen Vertex- und Fragment-Shader. Was der Vertex-Shader in eine `out`-Variable schreibt, kommt im Fragment-Shader in der `in`-Variable mit demselben Namen und Typ an, interpoliert für das Pixelzentrum des Fragments.

\begin{task}[Farben der Ecken]
Gib in \vscode{src/raster/raster.vert}[raster.vert] und \vscode{src/raster/raster.frag}[raster.frag] die Farbe jeder Ecke an den Fragment-Shader weiter, so dass jedes Fragment die interpolierte Farbe bekommt.

1. Lass die Ecken aus der vorigen Aufgabe stehen und setze die Farben auf Rot, Grün und Blau. Welche Bytes bekommt Pixel $(5, 7)$? Prüfe mit „Bytes (R, G, B)“.
2. Wie hängen die drei Bytes eines Pixels mit den baryzentrischen Koordinaten seines Zentrums zusammen?
3. Benenne die `in`-Variable im Fragment-Shader überall um, in der Deklaration und in `main`, aber nicht im Vertex-Shader, und klicke Run. Was meldet der Editor, und warum? Stelle danach den Namen wieder her.
\end{task}

\begin{webgl}
Fehlermeldungen des Linkers nennen `in`- und `out`-Variablen zwischen den Shadern oft „varying“. So hießen sie in älteren Versionen von GLSL.
\end{webgl}

## Innen oder außen

Ob ein Pixelzentrum im Dreieck liegt, entscheidet die GPU mit Edge Function Testing (Kapitel 3, Dreiecksrasterisierung). Jede Kante $v_i \to v_j$ ist dabei eine gerichtete Linie, die die Ebene in zwei Halbräume teilt. Die Edge Function

$$
E^{ij}(x, y) = (y_i - y_j)\,x + (x_j - x_i)\,y + (x_i y_j - x_j y_i)
$$

ist auf der Linie 0, im positiven Halbraum $H^+$ größer als 0 und im negativen Halbraum $H^-$ kleiner als 0.

Welche Vorzeichen die drei Edge Functions im Inneren des Dreiecks haben, hängt von der Winding Order ab, also von der Orientierung, in der die Ecken $v_0, v_1, v_2$ angeordnet sind (Kapitel 3, Edge Function Testing – Winding Order). Sie ergibt sich aus dem Vorzeichen von

$$
A = (v_1 - v_0) \times (v_2 - v_0) = (x_1 - x_0)(y_2 - y_0) - (y_1 - y_0)(x_2 - x_0).
$$

Ist $A > 0$, sind im Inneren alle drei Edge Functions positiv. Sind die Ecken in der anderen Orientierung angeordnet, kehren sich die Vorzeichen aller $E^{ij}$ um, und bei $A = 0$ liegen die Ecken auf einer Geraden.

\begin{webgl}
In der Vorlesung zeigt $y$ nach oben, und $A > 0$ heißt dort, dass die Ecken gegen den Uhrzeigersinn (CCW) angeordnet sind. Weil $y$ auf dieser Seite nach unten zeigt, sind die Ecken eines Dreiecks mit $A > 0$ auf dem Bildschirm im Uhrzeigersinn (CW) angeordnet.
\end{webgl}

Die Edge Functions liefern auch die baryzentrischen Koordinaten eines Punktes $p$ (Kapitel 3, Edge Function Testing: Baryzentrische Koordinaten). Diese sind die Quotienten der Teilflächen von $p$ mit je zwei Eckpunkten und der Fläche des ganzen Dreiecks,

$$
\alpha = \frac{A(v_1, v_2, p)}{A(v_0, v_1, v_2)}, \qquad \beta = \frac{A(v_2, v_0, p)}{A(v_0, v_1, v_2)}, \qquad \gamma = \frac{A(v_0, v_1, p)}{A(v_0, v_1, v_2)},
$$

und jede Teilfläche ist die Hälfte einer Edge Function:

$$
\begin{aligned}
A(v_0, v_1, p) &= \tfrac{1}{2}\,E^{01}(p), \\
A(v_1, v_2, p) &= \tfrac{1}{2}\,E^{12}(p), \\
A(v_2, v_0, p) &= \tfrac{1}{2}\,E^{20}(p).
\end{aligned}
$$

Die Fläche des ganzen Dreiecks ist die Hälfte von $A$, und die drei Edge Functions ergeben zusammen ihr Doppeltes, also $A$:

$$
\begin{aligned}
A(v_0, v_1, v_2) &= \tfrac{1}{2}\,(v_1 - v_0) \times (v_2 - v_0), \\
E^{01}(p) + E^{12}(p) + E^{20}(p) &= 2A(v_0, v_1, v_2).
\end{aligned}
$$

Getestet werden nur die Pixel in der Bounding Box des Dreiecks, geschnitten mit dem Raster, jeweils an ihrem Pixelzentrum.

Die Demo zeigt ein Dreieck und einen gelben Punkt $p$, an dem rechts die Edge Functions, $A$ und die baryzentrischen Koordinaten stehen. Unter „Kante“ lässt sich eine Kante wählen; ihr positiver Halbraum erscheint dann grün und ihr negativer rot. Die Ecken und $p$ lassen sich mit der Maus ziehen.

\demo{edge-functions}

\begin{task}[Edge Functions]
1. Setze die Ecken auf $v_0 = (2, 1)$, $v_1 = (14, 4)$ und $v_2 = (5, 11)$ und „Kante“ auf $v_0 \to v_1$. Auf welcher Seite des Pfeils ist $E^{01}$ positiv, in Pfeilrichtung gesehen links oder rechts, und warum ist das die andere Seite als in der Vorlesung?
2. Sage die Vorzeichen von $E^{01}$, $E^{12}$ und $E^{20}$ am Zentrum von Pixel $(6, 5)$ voraus und berechne dort $\alpha$ von Hand. Ziehe $p$ dorthin und prüfe. Ziehe $p$ danach um 4 Pixel nach rechts und 1 Pixel nach unten, also parallel zur Kante $v_0 \to v_1$. Welche der drei Edge Functions bleibt gleich, und was bedeutet das für $\gamma$?
3. Ziehe $p$ vom Zentrum von Pixel $(6, 5)$ ein Pixel nach rechts und danach ein Pixel nach unten. Um wie viel ändert sich jede Edge Function bei jedem Schritt, und warum ist das für die Rasterisierung nützlich?
\end{task}

## Pixel auf gemeinsamen Kanten

Liegt ein Pixelzentrum genau auf einer Kante, die zwei Dreiecke gemeinsam haben, darf das Pixel weder doppelt noch gar nicht gesetzt werden. Die Beispiel-Implementierung in Kapitel 3 zählt einen Punkt mit $E^{ij} = 0$ deshalb nur bei manchen Kanten zum Dreieck, nach der Top-Left-Konvention: Mit $\Delta x = x_j - x_i$ und $\Delta y = y_j - y_i$ gehört die Kante $v_i \to v_j$ dazu, wenn $\Delta y > 0$ gilt oder wenn $\Delta y = 0$ und $\Delta x < 0$ gilt. Die Beispiel-Implementierung rasterisiert nur Dreiecke mit $A > 0$, und bei ihnen sind das die rechten und die unteren Kanten. Entscheidend ist, dass jede gemeinsame Kante zweier Dreiecke genau einem von beiden gehört.

\begin{webgl}
Die Beispiel-Implementierung in Kapitel 3 zeichnet in eine Canvas, auf der $y$ wie auf dieser Seite nach unten zeigt. Mit $y$ nach oben wie in den Abbildungen der Folien wären es die oberen und die rechten Kanten.

WebGL rasterisiert wie OpenGL ES 3.0. Die Spezifikation verlangt nur: Liegen zwei Dreiecke auf verschiedenen Seiten einer gemeinsamen Kante mit denselben Endpunkten und liegt ein Pixelzentrum auf dieser Kante, dann erzeugt genau eines der beiden ein Fragment. Welches der beiden, legt sie nicht fest.
\end{webgl}

## Eigene Umsetzung

\begin{task}[Eigener Rasterisierer]
Schreibe einen Rasterisierer für Dreiecke mit Eckfarben, der auf der GPU läuft und mit Edge Function Testing selbst entscheidet, welche Pixel zu einem Dreieck gehören, statt die GPU die Dreiecke rasterisieren zu lassen. Rufe deinen Code aus \vscode{src/solution/index.ts}[start] auf; das Ergebnis erscheint in der Demo unter dieser Aufgabe.

Das Ergebnis soll mindestens zwei Dreiecke mit einer gemeinsamen Kante auf einem Raster zeigen, dessen Pixel man einzeln erkennt; Ecken und Farben sollen sich einstellen lassen. Die Ecken werden wie auf dieser Seite in Pixelkoordinaten angegeben, mit $y$ nach unten. Es soll für beide Winding Orders gleich aussehen, ein Dreieck ohne Fläche soll nichts zeichnen, und auf einer gemeinsamen Kante soll jedes Pixel nach der Top-Left-Konvention genau einem der beiden Dreiecke gehören.

1. Zeichne das Quadrat von $(0, 0)$ bis $(8, 8)$ als die Dreiecke $(0, 0), (8, 0), (8, 8)$ und $(0, 0), (8, 8), (0, 8)$, einmal mit dem ersten und einmal mit dem zweiten Dreieck zuerst gezeichnet. Welches Dreieck färbt in deinem Bild die Pixel auf der Diagonalen, und warum?
2. Vertausche zwei Ecken eines der Dreiecke. Gehört in deinem Bild noch jedes Pixel der gemeinsamen Kante zu genau einem Dreieck? Wenn nicht: Welche Pixel fehlen oder wechseln mit der Reihenfolge, und warum?
3. Stelle die Ecken und Farben eines deiner Dreiecke auch in der ersten Demo dieser Seite ein. Setzt die GPU dort andere Pixel als dein Rasterisierer? Wenn ja, welche, und was folgt daraus für ihre Regel?
\end{task}

\demo{solution}

\begin{task}[Rasterisierer auf der CPU (optional)]
Schreibe deinen Rasterisierer noch einmal als Schleife auf der CPU, wie die Beispiel-Implementierung des Edge Function Testings in Kapitel 3, und vergleiche ihn mit deiner Version auf der GPU. Auch er startet aus \vscode{src/solution/index.ts}[start] und zeigt sein Ergebnis in der Demo oben. Ideen: die Bounding Box als Grenzen der Schleifen, die Edge Functions schrittweise weiterrechnen, wenn $x$ oder $y$ um 1 wächst, dieselbe Regel für gemeinsame Kanten, und beide Versionen nebeneinander oder abwechselnd zeigen.
\end{task}

\begin{summary}
Beschreibe in eigenen Worten, was du auf dieser Seite gelernt hast und wie du es umgesetzt hast. Save speichert deinen Text in \vscode{summary.md}[summary.md].

\textfield{summary.md}
\end{summary}

\begin{quiz}
Bei jeder Frage ist mindestens eine Antwort richtig, aber auch mehrere Antworten können richtig sein.

\begin{question}
Ein Dreieck bedeckt einen Teil von Pixel $(4, 2)$, aber nicht sein Pixelzentrum $(4.5, 2.5)$. Was stimmt?
- [ ] Für das Pixel entsteht ein Fragment, das nur teilweise gefärbt wird.
- [x] Für das Pixel entsteht kein Fragment.
- [ ] Der Fragment-Shader läuft für das Pixel und verwirft es.
- [x] Das Pixel behält seine bisherige Farbe.
\end{question}

\begin{question}
Ein Punkt $p$ hat die baryzentrischen Koordinaten $(\alpha, \beta, \gamma) = (0.5, -0.25, 0.75)$. Was stimmt?
- [x] $p$ liegt außerhalb des Dreiecks.
- [ ] $p$ liegt auf einer Kante des Dreiecks.
- [x] $p$ liegt jenseits der Kante zwischen $v_2$ und $v_0$.
- [ ] Die Koordinaten sind ungültig, weil eine von ihnen negativ ist.
\end{question}

\begin{question}
Das Dreieck hat die Ecken $v_0 = (0, 0)$, $v_1 = (4, 0)$ und $v_2 = (0, 4)$. Welche baryzentrischen Koordinaten $(\alpha, \beta, \gamma)$ hat der Punkt $p = (1, 1)$?
- [x] $(0.5, 0.25, 0.25)$
- [ ] $(0.25, 0.25, 0.5)$
- [ ] $(1/3, 1/3, 1/3)$
- [ ] $(0.25, 0.5, 0.25)$
\end{question}

\begin{question}
Ein Punkt $p$ liegt im Inneren des Dreiecks $\{v_0, v_1, v_2\}$ mit $A > 0$, und jede Ecke hat eine Farbe. Danach werden $v_0$ und $v_1$ mitsamt ihren Farben vertauscht. Was stimmt?
- [ ] Die interpolierte Farbe an $p$ ändert sich.
- [x] $A$ wechselt das Vorzeichen.
- [ ] $p$ liegt danach außerhalb des Dreiecks.
- [x] $E^{01}(p)$, $E^{12}(p)$ und $E^{20}(p)$ sind danach alle negativ.
\end{question}

\begin{question}
Jeder Eckpunkt hat eine Position $(x, y)$ und eine Farbe $(r, g, b, a)$, sechs Floats hintereinander im Vertex-Array. Welche Werte haben stride und der Offset der Farbe in Bytes?
- [ ] stride 6, Offset 2
- [x] stride 24, Offset 8
- [ ] stride 24, Offset 2
- [ ] stride 20, Offset 8
\end{question}

\begin{question}
Ein Dreieck wird mit `gl.drawArrays(gl.TRIANGLES, 0, 3)` gezeichnet. Welche Aussagen über den Fragment-Shader dieses Aufrufs stimmen?
- [x] Er bekommt in seinen `in`-Variablen Werte, die aus den Werten an den drei Eckpunkten interpoliert sind.
- [ ] Er kann die Farbe eines benachbarten Fragments lesen.
- [x] Er läuft einmal für jedes Fragment, das bei der Rasterisierung dieses Dreiecks entsteht.
- [ ] Er läuft dreimal, einmal für jeden Eckpunkt.
\end{question}

\begin{question}
Welche Werte sind in allen Fragmenten eines Aufrufs von `drawArrays` gleich?
- [ ] eine `in`-Variable des Fragment-Shaders
- [x] ein `uniform`
- [ ] die Position des Fragments
\end{question}

\begin{question}
Ein Dreieck hat $A > 0$, und $y$ zeigt wie auf dieser Seite nach unten. Ein Pixelzentrum liegt genau auf einer Kante. Bei welchen Kanten gehört das Pixel nach der Top-Left-Konvention der Vorlesung zum Dreieck?
- [ ] bei einer oberen waagrechten Kante
- [x] bei einer unteren waagrechten Kante
- [ ] bei einer linken Kante
- [x] bei einer rechten Kante
\end{question}
\end{quiz}
