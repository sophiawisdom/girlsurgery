
const canvas = document.getElementById('typeCanvas');
let gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: false,
    antialias: false,
    powerPreference: 'low-power'
});

if (!gl) {
    console.error('WebGL2 not supported');
}

// Enable blending
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

// Group definitions - VERY bright, almost white tinted colors
const groups = ['aboutme', 'links', 'video', 'reachout', 'thinking', 'pictures', 'songs', 'words', 'places', 'clothes', 'interests'];
const groupColors = {
    'aboutme': [255, 230, 230],      // very light red/pink
    'links': [230, 255, 230],         // very light green
    'video': [230, 240, 255],         // very light blue
    'reachout': [255, 255, 230],      // very light yellow
    'thinking': [240, 245, 255],      // almost white blue
    'pictures': [255, 230, 245],      // very light pink
    'songs': [245, 230, 255],         // very light purple
    'words': [255, 245, 230],         // very light orange
    'places': [230, 255, 245],        // very light cyan
    'clothes': [255, 240, 240],       // almost white pink
    'interests': [255, 250, 230]      // almost white yellow
};

/*
const groupColors = {
    'aboutme': [255, 255, 255],      // very light red/pink
    'links': [255, 255, 255],         // very light green
    'video': [255, 255, 255],         // very light blue
    'reachout': [255, 255, 255],      // very light yellow
    'thinking': [255, 255, 255],      // almost white blue
    'pictures': [255, 255, 255],      // very light pink
    'songs': [255, 255, 255],         // very light purple
    'words': [255, 255, 255],         // very light orange
    'places': [255, 255, 255],        // very light cyan
    'clothes': [255, 255, 255],       // almost white pink
    'interests': [255, 255, 255]      // almost white yellow
};
*/

// Convert to array indexed by group index
const colorArray = groups.map(g => groupColors[g]);

// Color drift
const colorDrift = {};
groups.forEach(group => {
    colorDrift[group] = [
        (Math.random() - 0.5) * 0.08,
        (Math.random() - 0.5) * 0.08,
        (Math.random() - 0.5) * 0.08
    ];
});

// Magnitude multipliers
const magnitudeMultipliers = {};
const magnitudeDrift = {};
groups.forEach(group => {
    magnitudeMultipliers[group] = 0.5 + Math.random();
    magnitudeDrift[group] = (Math.random() - 0.5) * 0.002;
});

function resizeCanvas() {
    const dpr = 1;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
}
resizeCanvas();

// Create textures for storing EMA values (ping-pong buffers)
function createStateTextures() {
    const textures = [];
    for (let i = 0; i < 3; i++) {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        textures.push(tex);
    }
    return textures;
}

let stateTextures = [createStateTextures(), createStateTextures()];
let currentState = 0;

// Create framebuffers for rendering to textures
function createStateFramebuffers(textures) {
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textures[0], 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, textures[1], 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, textures[2], 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
    return fb;
}

const framebuffers = [createStateFramebuffers(stateTextures[0]), createStateFramebuffers(stateTextures[1])];

// Fullscreen quad
const quadVertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
const quadBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

// Vertex shader (same for both passes)
const vertexShaderSource = `#version 300 es
in vec2 position;
out vec2 uv;
void main() {
    uv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
}`;

// Update shader - applies decay and emissions
const updateShaderSource = `#version 300 es
precision highp float;

in vec2 uv;
layout(location = 0) out vec4 outState0;
layout(location = 1) out vec4 outState1;
layout(location = 2) out vec4 outState2;

uniform sampler2D state0;
uniform sampler2D state1;
uniform sampler2D state2;

uniform float decay;
uniform vec2 resolution;

// Point sources (max 50)
uniform int numSources;
uniform vec2 sourcePositions[50];
uniform float sourceStrengths[50];
uniform int sourceGroups[50];

void main() {
    // Read current EMA values
    vec4 ema0 = texture(state0, uv);
    vec4 ema1 = texture(state1, uv);
    vec4 ema2 = texture(state2, uv);

    // Apply decay
    ema0 *= decay;
    ema1 *= decay;
    ema2 *= decay;

    // Current pixel position in world space
    vec2 pixelPos = uv * resolution;

    // Add emissions from sources
    for (int i = 0; i < numSources && i < 50; i++) {
        vec2 sourcePos = sourcePositions[i];
        float strength = sourceStrengths[i];
        int group = sourceGroups[i];

        float dist = distance(pixelPos, sourcePos);
        float maxDist = strength * 2.5;

        if (dist < maxDist) {
            float falloff = 1.0 - (dist / maxDist);
            float emission = strength * falloff * falloff * 1.2;

            // Add to appropriate channel
            if (group < 4) {
                if (group == 0) ema0.r = mix(ema0.r, emission, 0.7);
                else if (group == 1) ema0.g = mix(ema0.g, emission, 0.7);
                else if (group == 2) ema0.b = mix(ema0.b, emission, 0.7);
                else if (group == 3) ema0.a = mix(ema0.a, emission, 0.7);
            } else if (group < 8) {
                if (group == 4) ema1.r = mix(ema1.r, emission, 0.7);
                else if (group == 5) ema1.g = mix(ema1.g, emission, 0.7);
                else if (group == 6) ema1.b = mix(ema1.b, emission, 0.7);
                else if (group == 7) ema1.a = mix(ema1.a, emission, 0.7);
            } else {
                if (group == 8) ema2.r = mix(ema2.r, emission, 0.7);
                else if (group == 9) ema2.g = mix(ema2.g, emission, 0.7);
                else if (group == 10) ema2.b = mix(ema2.b, emission, 0.7);
            }
        }
    }

    outState0 = ema0;
    outState1 = ema1;
    outState2 = ema2;
}`;

// blend
const renderShaderSource = `#version 300 es
precision highp float;

in vec2 uv;
out vec4 fragColor;

uniform sampler2D state0;
uniform sampler2D state1;
uniform sampler2D state2;

// Group colors (11 groups)
uniform vec3 colors[11];

void main() {
    vec4 ema0 = texture(state0, uv);
    vec4 ema1 = texture(state1, uv);
    vec4 ema2 = texture(state2, uv);

    // Collect all EMA values
    float emas[11];
    emas[0] = ema0.r;
    emas[1] = ema0.g;
    emas[2] = ema0.b;
    emas[3] = ema0.a;
    emas[4] = ema1.r;
    emas[5] = ema1.g;
    emas[6] = ema1.b;
    emas[7] = ema1.a;
    emas[8] = ema2.r;
    emas[9] = ema2.g;
    emas[10] = ema2.b;

    // Calculate total intensity
    float totalIntensity = 0.0;
    for (int i = 0; i < 11; i++) {
        totalIntensity += emas[i];
    }

    if (totalIntensity < 0.001) {
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    // Blend colors weighted by their EMA values
    vec3 blendedColor = vec3(0.0);
    for (int i = 0; i < 11; i++) {
        float weight = emas[i] / totalIntensity;
        blendedColor += (colors[i] / 255.0) * weight;
    }

    // Alpha based on total intensity
    float alpha = min(0.95, totalIntensity * 0.8);
    fragColor = vec4(blendedColor, alpha);
}`;

function compileShader(source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function createProgram(vertSource, fragSource) {
    const vertShader = compileShader(vertSource, gl.VERTEX_SHADER);
    const fragShader = compileShader(fragSource, gl.FRAGMENT_SHADER);
    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}

const updateProgram = createProgram(vertexShaderSource, updateShaderSource);
const renderProgram = createProgram(vertexShaderSource, renderShaderSource);

// Get uniform locations for update shader
const updateUniforms = {
    state0: gl.getUniformLocation(updateProgram, 'state0'),
    state1: gl.getUniformLocation(updateProgram, 'state1'),
    state2: gl.getUniformLocation(updateProgram, 'state2'),
    decay: gl.getUniformLocation(updateProgram, 'decay'),
    resolution: gl.getUniformLocation(updateProgram, 'resolution'),
    numSources: gl.getUniformLocation(updateProgram, 'numSources'),
    sourcePositions: gl.getUniformLocation(updateProgram, 'sourcePositions'),
    sourceStrengths: gl.getUniformLocation(updateProgram, 'sourceStrengths'),
    sourceGroups: gl.getUniformLocation(updateProgram, 'sourceGroups')
};

// Get uniform locations for render shader
const renderUniforms = {
    state0: gl.getUniformLocation(renderProgram, 'state0'),
    state1: gl.getUniformLocation(renderProgram, 'state1'),
    state2: gl.getUniformLocation(renderProgram, 'state2'),
    colors: gl.getUniformLocation(renderProgram, 'colors')
};

// EMA decay
const fps = 30;
const halfLifeSeconds = 1;
const emaDecay = Math.exp(-Math.log(2) / (halfLifeSeconds * fps));

// Cache sources
let cachedSources = null;
let lastSourceUpdate = 0;

function getPointSources() {
    const now = Date.now();
    if (cachedSources && now - lastSourceUpdate < 2000) {
        return cachedSources;
    }

    const sources = [];
    document.querySelectorAll('[splittable][group].positioned').forEach(el => {
        const rect = el.getBoundingClientRect();
        const group = el.getAttribute('group');
        const groupIndex = groups.indexOf(group);
        if (groupIndex >= 0) {
            const dpr = canvas.width / window.innerWidth;
            sources.push({
                x: (rect.left + rect.width / 2) * dpr,
                y: (rect.top + rect.height / 2) * dpr,
                strength: Math.sqrt(rect.width * rect.height) * 2.2 * magnitudeMultipliers[group] * dpr,
                groupIndex: groupIndex
            });
        }
    });

    cachedSources = sources;
    lastSourceUpdate = now;
    return sources;
}

function updateColors() {
    Object.keys(groupColors).forEach(group => {
        for (let i = 0; i < 3; i++) {
            groupColors[group][i] += colorDrift[group][i];
            // Keep in very bright range (230-255)
            if (groupColors[group][i] > 255 || groupColors[group][i] < 230) {
                colorDrift[group][i] *= -1;
                groupColors[group][i] = Math.max(230, Math.min(255, groupColors[group][i]));
            }
        }
    });
    groups.forEach((g, i) => colorArray[i] = groupColors[g]);
}

function updateMagnitudes() {
    Object.keys(magnitudeMultipliers).forEach(group => {
        magnitudeMultipliers[group] += magnitudeDrift[group];
        if (magnitudeMultipliers[group] > 1.5 || magnitudeMultipliers[group] < 0.5) {
            magnitudeDrift[group] *= -1;
            magnitudeMultipliers[group] = Math.max(0.5, Math.min(1.5, magnitudeMultipliers[group]));
        }
    });
}

function render() {
    updateColors();
    updateMagnitudes();

    const sources = getPointSources();
    const numSources = Math.min(sources.length, 50);

    const positions = new Float32Array(100);
    const strengths = new Float32Array(50);
    const groupIndices = new Int32Array(50);

    for (let i = 0; i < numSources; i++) {
        positions[i * 2] = sources[i].x;
        positions[i * 2 + 1] = sources[i].y;
        strengths[i] = sources[i].strength;
        groupIndices[i] = sources[i].groupIndex;
    }

    // Update pass
    gl.useProgram(updateProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[1 - currentState]);
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, stateTextures[currentState][0]);
    gl.uniform1i(updateUniforms.state0, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, stateTextures[currentState][1]);
    gl.uniform1i(updateUniforms.state1, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, stateTextures[currentState][2]);
    gl.uniform1i(updateUniforms.state2, 2);

    gl.uniform1f(updateUniforms.decay, emaDecay);
    gl.uniform2f(updateUniforms.resolution, canvas.width, canvas.height);
    gl.uniform1i(updateUniforms.numSources, numSources);
    gl.uniform2fv(updateUniforms.sourcePositions, positions);
    gl.uniform1fv(updateUniforms.sourceStrengths, strengths);
    gl.uniform1iv(updateUniforms.sourceGroups, groupIndices);

    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    const posLoc = gl.getAttribLocation(updateProgram, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    currentState = 1 - currentState;

    // Render pass
    gl.useProgram(renderProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, stateTextures[currentState][0]);
    gl.uniform1i(renderUniforms.state0, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, stateTextures[currentState][1]);
    gl.uniform1i(renderUniforms.state1, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, stateTextures[currentState][2]);
    gl.uniform1i(renderUniforms.state2, 2);

    const flatColors = new Float32Array(33);
    for (let i = 0; i < 11; i++) {
        flatColors[i * 3] = colorArray[i][0];
        flatColors[i * 3 + 1] = colorArray[i][1];
        flatColors[i * 3 + 2] = colorArray[i][2];
    }
    gl.uniform3fv(renderUniforms.colors, flatColors);

    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    const renderPosLoc = gl.getAttribLocation(renderProgram, 'position');
    gl.enableVertexAttribArray(renderPosLoc);
    gl.vertexAttribPointer(renderPosLoc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

let lastFrameTime = 0;
const frameInterval = 1000 / fps;

function animate(currentTime) {
    requestAnimationFrame(animate);

    const elapsed = currentTime - lastFrameTime;
    if (elapsed < frameInterval) return;

    lastFrameTime = currentTime - (elapsed % frameInterval);
    render();
}

let started = false;
function tryStart() {
    if (started) return;
    const positioned = document.querySelectorAll('[splittable][group].positioned');
    if (positioned.length > 0) {
        started = true;
        resizeCanvas();
        requestAnimationFrame(animate);
    } else {
        setTimeout(tryStart, 100);
    }
}

window.addEventListener('resize', () => {
    resizeCanvas();
    stateTextures = [createStateTextures(), createStateTextures()];
    currentState = 0;
});

window.addEventListener('scroll', () => {
    cachedSources = null;
});

document.fonts.ready.then(() => {
    setTimeout(tryStart, 500);
});
