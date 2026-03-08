(function initScanPage() {
  const root = document.querySelector('[data-scan-page]');
  if (!root) {
    return;
  }

  if (typeof window.Html5Qrcode === 'undefined') {
    return;
  }

  const startButton = root.querySelector('[data-scan-start]');
  const stopButton = root.querySelector('[data-scan-stop]');
  const resetButton = root.querySelector('[data-scan-reset]');
  const cameraSelect = root.querySelector('[data-camera-select]');
  const statusText = root.querySelector('[data-scan-status]');
  const errorBox = root.querySelector('[data-scan-error]');
  const successBox = root.querySelector('[data-scan-success]');
  const summaryBox = root.querySelector('[data-scan-summary]');

  const scanner = new window.Html5Qrcode('scan-reader');
  let cameras = [];
  let isRunning = false;
  let isProcessing = false;
  let lastProcessed = { value: '', at: 0 };

  function setStatus(text) {
    statusText.textContent = text;
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
  }

  function hideError() {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
  }

  function showSuccess(message) {
    successBox.textContent = message;
    successBox.classList.remove('hidden');
  }

  function hideSuccess() {
    successBox.textContent = '';
    successBox.classList.add('hidden');
  }

  function clearSummary() {
    summaryBox.innerHTML = '';
    summaryBox.classList.add('hidden');
  }

  function showSummary(data, scannedResiId) {
    const row = data && typeof data === 'object' ? data : {};
    const resiId = row.resi_id || row.resiId || scannedResiId;
    const labelId = row.id || row.label_id || '-';
    const statusScan = Number(row.status_scan || row.status || row.scanned || 0) === 1 ? 'Selesai' : 'Belum Scan';
    const scannedAt = row.scanned_at || row.scannedAt || '-';

    summaryBox.innerHTML = [
      '<h3>Ringkasan Resi</h3>',
      `<p><strong>Resi ID:</strong> ${escapeHtml(String(resiId || '-'))}</p>`,
      `<p><strong>ID Label:</strong> ${escapeHtml(String(labelId))}</p>`,
      `<p><strong>Status:</strong> ${escapeHtml(statusScan)}</p>`,
      `<p><strong>Scanned At:</strong> ${escapeHtml(String(scannedAt))}</p>`,
      resiId ? `<a class="btn btn-outline" href="/resi/selesai?q=${encodeURIComponent(String(resiId))}">Lihat di Selesai</a>` : ''
    ].join('');
    summaryBox.classList.remove('hidden');
  }

  function setButtons() {
    startButton.disabled = isRunning || isProcessing;
    stopButton.disabled = !isRunning;
    resetButton.disabled = isRunning;
    cameraSelect.disabled = isRunning || isProcessing || cameras.length === 0;
  }

  function pickDefaultCamera() {
    if (!cameras.length) {
      return '';
    }

    const preferred = cameras.find((camera) => /back|rear|environment/i.test(camera.label || ''));
    return (preferred || cameras[0]).id;
  }

  function validResiId(value) {
    return /^[a-zA-Z0-9_-]{2,120}$/.test(value);
  }

  function normalizeQrValue(rawValue) {
    const value = String(rawValue || '').trim();
    if (!value) {
      return '';
    }

    return value;
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function stopScanner() {
    if (!isRunning) {
      return;
    }

    try {
      await scanner.stop();
    } catch (_error) {
      // Ignore stop errors, scanner can already be stopped.
    } finally {
      isRunning = false;
      setButtons();
    }
  }

  async function handleScanSuccess(decodedText) {
    if (isProcessing) {
      return;
    }

    const resiId = normalizeQrValue(decodedText);
    if (!validResiId(resiId)) {
      showError('QR tidak dikenali sebagai resi ID yang valid.');
      setStatus('Gagal validasi QR.');
      return;
    }

    const now = Date.now();
    if (lastProcessed.value === resiId && now - lastProcessed.at < 5000) {
      setStatus('QR sama terdeteksi ulang. Tunggu beberapa detik sebelum scan lagi.');
      return;
    }

    isProcessing = true;
    setButtons();
    hideError();
    hideSuccess();
    clearSummary();
    setStatus(`Memproses resi ${resiId}...`);

    await stopScanner();

    try {
      const response = await fetch('/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ resi_id: resiId })
      });

      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.location.href = '/login?message=' + encodeURIComponent('Sesi login tidak valid. Silakan login ulang.');
        return;
      }

      if (!response.ok || payload.success === false) {
        const message = payload.message || 'Gagal memproses scan. Silakan coba lagi.';
        showError(message);
        setStatus('Pemrosesan gagal.');
        return;
      }

      lastProcessed = { value: resiId, at: now };
      showSuccess(payload.message || 'Scan berhasil diproses.');
      showSummary(payload.data || {}, resiId);
      setStatus('Scan berhasil. Resi dipindahkan ke kategori selesai.');
    } catch (_error) {
      showError('Terjadi gangguan jaringan saat memproses scan. Coba lagi.');
      setStatus('Pemrosesan gagal.');
    } finally {
      isProcessing = false;
      setButtons();
    }
  }

  async function loadCameras() {
    hideError();
    setStatus('Memuat kamera...');
    try {
      cameras = await window.Html5Qrcode.getCameras();
      if (!cameras.length) {
        throw new Error('Tidak ada kamera terdeteksi di perangkat ini.');
      }

      cameraSelect.innerHTML = '';
      cameras.forEach((camera) => {
        const option = document.createElement('option');
        option.value = camera.id;
        option.textContent = camera.label || camera.id;
        cameraSelect.appendChild(option);
      });
      cameraSelect.value = pickDefaultCamera();
      cameraSelect.disabled = false;
      setStatus('Kamera siap. Tekan "Mulai Scan".');
    } catch (error) {
      showError(error.message || 'Tidak bisa mengakses kamera. Periksa izin kamera browser.');
      setStatus('Gagal akses kamera.');
    } finally {
      setButtons();
    }
  }

  async function startScanner() {
    if (isRunning || isProcessing) {
      return;
    }

    hideError();
    hideSuccess();
    clearSummary();

    const cameraId = cameraSelect.value || pickDefaultCamera();
    if (!cameraId) {
      showError('Kamera belum tersedia. Pastikan izin kamera sudah diberikan.');
      setStatus('Kamera belum tersedia.');
      return;
    }

    try {
      setStatus('Mengaktifkan scanner...');
      await scanner.start(
        { deviceId: { exact: cameraId } },
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
          rememberLastUsedCamera: true,
          aspectRatio: 1.333
        },
        handleScanSuccess
      );
      isRunning = true;
      setStatus('Scanner aktif. Arahkan kamera ke QR resi.');
    } catch (_error) {
      showError('Gagal memulai scanner. Cek izin kamera atau pilih kamera lain.');
      setStatus('Scanner gagal aktif.');
      isRunning = false;
    } finally {
      setButtons();
    }
  }

  startButton.addEventListener('click', startScanner);
  stopButton.addEventListener('click', async () => {
    hideError();
    await stopScanner();
    setStatus('Scanner dihentikan.');
  });
  resetButton.addEventListener('click', async () => {
    hideError();
    hideSuccess();
    clearSummary();
    await stopScanner();
    setStatus('Siap scan ulang.');
  });

  window.addEventListener('beforeunload', () => {
    if (isRunning) {
      scanner.stop().catch(() => {});
    }
  });

  setButtons();
  loadCameras();
})();
