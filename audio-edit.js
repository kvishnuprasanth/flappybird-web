(function () {
  const MAX_DURATION = 5;
  const SOUNDS = [
    { id: 'flap', label: 'Flap' },
    { id: 'pass_pipe', label: 'Pass pipe' },
    { id: 'gameover', label: 'Game over' },
    { id: 'swoosh', label: 'Swoosh' },
  ];

  let audioContext = null;
  let decodedBuffer = null;
  let wavesurfer = null;
  let currentSoundId = null;
  let trimStart = 0;
  let trimEnd = 5;
  let fileBlobUrl = null;

  function getAudioContext() {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    return audioContext;
  }

  function showEditView() {
    document.getElementById('main-menu').style.display = 'none';
    const gameover = document.getElementById('gameover-menu');
    if (gameover) gameover.style.display = 'none';
    document.getElementById('edit-view').style.display = 'block';
    renderSoundList();
    if (window.renderAssetGrid) window.renderAssetGrid();
  }

  function showMainMenu() {
    document.getElementById('edit-view').style.display = 'none';
    document.getElementById('main-menu').style.display = 'flex';
  }

  function renderSoundList() {
    const list = document.getElementById('sound-list');
    list.innerHTML = '';
    SOUNDS.forEach(function (s) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sound-item';
      btn.textContent = s.label;
      btn.dataset.id = s.id;
      btn.addEventListener('click', function () {
        openTrimPanel(s.id);
      });
      list.appendChild(btn);
    });
  }

  function openTrimPanel(soundId) {
    currentSoundId = soundId;
    document.getElementById('trim-panel').style.display = 'block';
    document.getElementById('trim-sound-label').textContent = 'Editing: ' + SOUNDS.find(function (s) { return s.id === soundId; }).label;
    document.getElementById('trim-feedback').style.display = 'none';
    document.getElementById('audio-file-input').value = '';
    resetTrimState();
  }

  function resetTrimState() {
    if (fileBlobUrl) {
      URL.revokeObjectURL(fileBlobUrl);
      fileBlobUrl = null;
    }
    decodedBuffer = null;
    trimStart = 0;
    trimEnd = Math.min(MAX_DURATION, 0.1);
    if (wavesurfer) {
      wavesurfer.destroy();
      wavesurfer = null;
    }
    document.getElementById('waveform-container').innerHTML = '';
    var startIn = document.getElementById('trim-start-input');
    var endIn = document.getElementById('trim-end-input');
    if (startIn) { startIn.value = '0'; startIn.disabled = true; }
    if (endIn) { endIn.value = '5'; endIn.disabled = true; }
    document.getElementById('trim-duration').textContent = 'Load an audio file (max ' + MAX_DURATION + 's)';
    document.getElementById('trim-preview').disabled = true;
    document.getElementById('trim-apply').disabled = true;
  }

  function updateTrimUI() {
    if (!decodedBuffer) return;
    const dur = trimEnd - trimStart;
    document.getElementById('trim-duration').textContent =
      trimStart.toFixed(2) + 's – ' + trimEnd.toFixed(2) + 's (' + dur.toFixed(2) + 's) — Max ' + MAX_DURATION + 's';
    document.getElementById('trim-preview').disabled = false;
    document.getElementById('trim-apply').disabled = false;
  }

  function clampTrimValues() {
    const duration = decodedBuffer ? decodedBuffer.duration : 0;
    const maxEnd = Math.min(trimStart + MAX_DURATION, duration);
    trimEnd = Math.max(trimStart + 0.01, Math.min(trimEnd, maxEnd));
    trimStart = Math.max(0, Math.min(trimStart, trimEnd - 0.01));
  }

  function onFileSelect(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    resetTrimState();
    const reader = new FileReader();
    reader.onload = async function (ev) {
      const arrayBuffer = ev.target.result;
      try {
        const ctx = getAudioContext();
        decodedBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
        const duration = decodedBuffer.duration;
        trimStart = 0;
        trimEnd = Math.min(MAX_DURATION, duration, Math.max(0.1, duration));
        clampTrimValues();

        var startIn = document.getElementById('trim-start-input');
        var endIn = document.getElementById('trim-end-input');
        if (startIn) {
          startIn.disabled = false;
          startIn.min = 0;
          startIn.max = Math.max(0, (duration - 0.01).toFixed(2));
          startIn.value = trimStart.toFixed(2);
        }
        if (endIn) {
          endIn.disabled = false;
          endIn.min = 0.01;
          endIn.max = duration;
          endIn.value = trimEnd.toFixed(2);
        }

        fileBlobUrl = URL.createObjectURL(file);
        const container = document.getElementById('waveform-container');
        container.innerHTML = '';
        if (typeof WaveSurfer !== 'undefined') {
          wavesurfer = WaveSurfer.create({
            container: container,
            waveColor: '#4a9eff',
            progressColor: '#1e88e5',
            height: 80,
            normalize: true,
          });
          await wavesurfer.load(fileBlobUrl);
        }
        updateTrimUI();
      } catch (err) {
        document.getElementById('trim-duration').textContent = 'Could not load audio. Try another file.';
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function playPreview() {
    if (!decodedBuffer) return;
    var ctx = getAudioContext();
    var src = ctx.createBufferSource();
    var startSample = Math.floor(trimStart * decodedBuffer.sampleRate);
    var endSample = Math.floor(trimEnd * decodedBuffer.sampleRate);
    var length = endSample - startSample;
    var segment = ctx.createBuffer(
      decodedBuffer.numberOfChannels,
      length,
      decodedBuffer.sampleRate
    );
    for (var ch = 0; ch < decodedBuffer.numberOfChannels; ch++) {
      segment.getChannelData(ch).set(decodedBuffer.getChannelData(ch).subarray(startSample, endSample));
    }
    src.buffer = segment;
    src.connect(ctx.destination);
    src.start(0);
  }

  function audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);
    const writeString = function (offset, s) {
      for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);
    const offset = 44;
    const channels = [];
    for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c));
    for (let i = 0; i < buffer.length; i++) {
      for (let c = 0; c < numChannels; c++) {
        const s = Math.max(-1, Math.min(1, channels[c][i]));
        const v = s < 0 ? s * 0x8000 : s * 0x7fff;
        view.setInt16(offset + (i * numChannels + c) * 2, v, true);
      }
    }
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  function applyTrim() {
    if (!decodedBuffer || !currentSoundId || typeof window.setGameSound !== 'function') return;
    clampTrimValues();
    const ctx = getAudioContext();
    const startSample = Math.floor(trimStart * decodedBuffer.sampleRate);
    const endSample = Math.floor(trimEnd * decodedBuffer.sampleRate);
    const length = endSample - startSample;
    const segment = ctx.createBuffer(
      decodedBuffer.numberOfChannels,
      length,
      decodedBuffer.sampleRate
    );
    for (var c = 0; c < decodedBuffer.numberOfChannels; c++) {
      segment.getChannelData(c).set(decodedBuffer.getChannelData(c).subarray(startSample, endSample));
    }
    var blob = audioBufferToWav(segment);
    const url = URL.createObjectURL(blob);
    window.setGameSound(currentSoundId, url);
    const feedback = document.getElementById('trim-feedback');
    feedback.textContent = 'Applied. This sound will be used in the game.';
    feedback.style.display = 'block';
  }

  function syncTrimFromInputs() {
    var startInput = document.getElementById('trim-start-input');
    var endInput = document.getElementById('trim-end-input');
    if (!startInput || !endInput) return;
    trimStart = parseFloat(startInput.value) || 0;
    trimEnd = parseFloat(endInput.value) || MAX_DURATION;
    clampTrimValues();
    startInput.value = trimStart.toFixed(2);
    endInput.value = trimEnd.toFixed(2);
    updateTrimUI();
  }

  function init() {
    document.querySelectorAll('.edit-button').forEach(function (btn) {
      btn.addEventListener('click', showEditView);
    });
    document.getElementById('back-to-game').addEventListener('click', showMainMenu);
    document.getElementById('audio-file-input').addEventListener('change', onFileSelect);
    document.getElementById('trim-preview').addEventListener('click', playPreview);
    document.getElementById('trim-apply').addEventListener('click', applyTrim);
    var startInput = document.getElementById('trim-start-input');
    var endInput = document.getElementById('trim-end-input');
    if (startInput) startInput.addEventListener('input', syncTrimFromInputs);
    if (endInput) endInput.addEventListener('input', syncTrimFromInputs);
  }

  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }
})();
