
(function () {
  function initBackground() {
    const canvas = document.getElementById("bg-canvas");
    if (!canvas) {
      console.error("Migaja BG: no existe #bg-canvas en el HTML.");
      return;
    }

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      powerPreference: "low-power"
    });

    if (!gl) {
      console.error("Migaja BG: WebGL no está disponible.");
      return;
    }

    const vertShader = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fragShader = `
      precision highp float;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec3 u_colors[4];
      uniform vec3 u_bg;

      vec3 permute(vec3 x) {
        return mod(((x*34.0)+1.0)*x, 289.0);
      }

      float snoise(vec2 v){
        const vec4 C = vec4(
          0.211324865405187,
          0.366025403784439,
          -0.577350269189626,
          0.024390243902439
        );

        vec2 i = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y)
          ? vec2(1.0, 0.0)
          : vec2(0.0, 1.0);

        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;

        i = mod(i, 289.0);

        vec3 p = permute(
          permute(i.y + vec3(0.0, i1.y, 1.0))
          + i.x + vec3(0.0, i1.x, 1.0)
        );

        vec3 m = max(
          0.5 - vec3(
            dot(x0,x0),
            dot(x12.xy,x12.xy),
            dot(x12.zw,x12.zw)
          ),
          0.0
        );

        m = m*m;
        m = m*m;

        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;

        m *= 1.79284291400159 - 0.85373472095314
          * (a0*a0 + h*h);

        vec3 g;
        g.x = a0.x * x0.x + h.x * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;

        return 130.0 * dot(m, g);
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        float ratio = u_resolution.x / u_resolution.y;

        vec2 p = uv - 0.5;
        p.x *= ratio;

        float t = u_time * 0.1;

        float n1 = snoise(p * 0.4 + vec2(t * 0.2, -t * 0.3));
        float n2 = snoise(p * 0.55 + vec2(-t * 0.15, t * 0.25) + n1 * 0.25);
        float n3 = snoise(p * 0.75 + vec2(t * 0.1, -t * 0.2) + n2 * 0.2);

        vec3 col = u_bg;

        float dist = length(p) * 1.5;
        float vignette = 1.0 - smoothstep(0.3, 1.2, dist);

        col = mix(col, u_colors[0], smoothstep(-0.2, 0.5, n1) * 0.85);
        col = mix(col, u_colors[1], smoothstep(-0.1, 0.6, n2) * 0.7);
        col = mix(col, u_colors[2], smoothstep(-0.3, 0.4, n3) * 0.6);
        col = mix(col, u_colors[3], smoothstep(0.0, 0.7, n1 * n2) * 0.5);

        float glow = smoothstep(0.8, 0.0, dist) * 0.3;
        col += u_colors[1] * glow;

        col = mix(col * 0.2, col, vignette);

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    function createShader(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Migaja BG: error compilando shader:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }

      return shader;
    }

    const vertex = createShader(gl.VERTEX_SHADER, vertShader);
    const fragment = createShader(gl.FRAGMENT_SHADER, fragShader);

    if (!vertex || !fragment) return;

    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Migaja BG: error enlazando programa:", gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const colorsLocation = gl.getUniformLocation(program, "u_colors[0]");
    const bgLocation = gl.getUniformLocation(program, "u_bg");

    const COLORS = ["#D1E535", "#D8C5E4", "#2C3522", "#EDE6DC"];
    const BG_COLOR = "#1B2317";

    function hexToRgb(hex) {
      const value = hex.replace("#", "");
      return [
        parseInt(value.substring(0, 2), 16) / 255,
        parseInt(value.substring(2, 4), 16) / 255,
        parseInt(value.substring(4, 6), 16) / 255
      ];
    }

    const colorData = new Float32Array(COLORS.flatMap(hexToRgb));
    const bgColor = hexToRgb(BG_COLOR);

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);

      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    resize();
    window.addEventListener("resize", resize);

    let animationFrame;

    function render(time) {
      gl.uniform2f(
        resolutionLocation,
        canvas.width,
        canvas.height
      );

      gl.uniform1f(timeLocation, time * 0.001);
      gl.uniform3fv(colorsLocation, colorData);
      gl.uniform3f(bgLocation, bgColor[0], bgColor[1], bgColor[2]);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      animationFrame = requestAnimationFrame(render);
    }

    function start() {
      if (!animationFrame) {
        animationFrame = requestAnimationFrame(render);
      }
    }

    function stop() {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else start();
    });

    start();

    console.log("Migaja BG: animación WebGL iniciada correctamente.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBackground);
  } else {
    initBackground();
  }
})();
