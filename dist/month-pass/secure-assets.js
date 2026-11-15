'use strict';
(() => {
  const names = ['facilities.jpg', 'choose-type.jpg', 'monthly-passes.jpg', 'background.png', 'ring.png', 'pool-motion-15s.mp4'];
  const pending = new Map();
  const urls = new Map();
  const blobs = new Map();
  const gate = document.getElementById('asset-gate');

  function getBlob(name) {
    if (!names.includes(name)) return Promise.reject(new Error('月票檔案無效。'));
    if (blobs.has(name)) return Promise.resolve(blobs.get(name));
    if (window.parent === window) return Promise.reject(new Error('請先登入泳堂管家，再由主頁開啟月票。'));
    if (pending.has(name)) return pending.get(name);
    const promise = new Promise((resolve, reject) => {
      const handler = (event) => {
        if (event.source !== window.parent || event.origin !== location.origin || event.data?.name !== name) return;
        if (event.data.type === 'month-pass:asset' && event.data.blob instanceof Blob) {
          window.removeEventListener('message', handler);
          blobs.set(name, event.data.blob);
          resolve(event.data.blob);
        } else if (event.data.type === 'month-pass:asset-error') {
          window.removeEventListener('message', handler);
          reject(new Error(event.data.message || '月票檔案無法載入。'));
        }
      };
      window.addEventListener('message', handler);
      window.parent.postMessage({ type: 'month-pass:asset-request', name }, location.origin);
    });
    pending.set(name, promise);
    return promise;
  }

  async function get(name) {
    if (urls.has(name)) return urls.get(name);
    const blob = await getBlob(name);
    if (!urls.has(name)) urls.set(name, URL.createObjectURL(blob));
    return urls.get(name);
  }

  Promise.all(names.filter((name) => name !== 'pool-motion-15s.mp4').map(get)).then(() => {
    document.querySelectorAll('[data-private-asset]').forEach((image) => { image.src = urls.get(image.dataset.privateAsset); });
    gate.hidden = true;
  }).catch((error) => { gate.textContent = error.message || '受保護月票暫時無法載入。'; });

  document.getElementById('download-video').addEventListener('click', async (event) => {
    event.preventDefault();
    const link = event.currentTarget;
    link.setAttribute('aria-busy', 'true');
    try {
      const url = await get('pool-motion-15s.mp4');
      const download = document.createElement('a');
      download.href = url;
      download.download = link.download;
      download.click();
    } catch {
      document.getElementById('status').textContent = '影片暫時無法下載，請稍後再試。';
    } finally {
      link.removeAttribute('aria-busy');
    }
  });

  window.addEventListener('pagehide', () => { urls.forEach((url) => URL.revokeObjectURL(url)); });
  window.MonthPassAssets = { get, getBlob };
})();
