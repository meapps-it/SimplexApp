/* Screenshot multipli nell'editor app: le selezioni successive si sommano. */
(() => {
  'use strict';
  function createScreenshotPicker({input, links, preview, counter, onError = () => {}, limit = 12, noun = 'screenshot', singular = 'screenshot'}) {
    if (!input || !links || !preview) throw Error('Editor screenshot incompleto.');
    const pending = [];
    const allowed = new Set(['image/png', 'image/jpeg', 'image/webp']);
    const existing = () => links.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const isDuplicate = (left, right) =>
      left === right || (left.name === right.name && left.size === right.size && left.lastModified === right.lastModified);
    function remove(file) {
      const index = pending.findIndex(entry => entry.file === file);
      if (index < 0) return false;
      const [entry] = pending.splice(index, 1);
      URL.revokeObjectURL(entry.previewUrl);
      render();
      return true;
    }
    function clear() {
      for (const entry of pending) URL.revokeObjectURL(entry.previewUrl);
      pending.length = 0;
      input.value = '';
      render();
    }
    function add(files, {replace = false} = {}) {
      const fresh = [];
      for (const file of files) {
        if ((!replace && pending.some(entry => isDuplicate(entry.file, file))) || fresh.some(item => isDuplicate(item, file))) continue;
        if (!allowed.has(file.type)) throw Error('Usa ' + noun + ' PNG, JPG o WebP.');
        if (file.size > 8 * 1024 * 1024) throw Error('Ogni immagine deve pesare meno di 8 MB.');
        fresh.push(file);
      }
      if ((replace ? 0 : existing().length + pending.length) + fresh.length > limit)
        throw Error('Massimo ' + limit + ' ' + noun + ' in tutto: elimina qualche immagine prima di aggiungerne altre.');
      if (replace && fresh.length) { clear(); links.value = ''; }
      for (const file of fresh) pending.push({file, previewUrl: URL.createObjectURL(file)});
      render();
      return fresh.length;
    }
    function tile(url, label, text, onRemove, pendingUpload) {
      const item = document.createElement('div');
      item.className = 'screen-editor-tile' + (pendingUpload ? ' screen-editor-pending' : '');
      const img = document.createElement('img');
      img.src = url;
      img.alt = label;
      img.loading = 'lazy';
      item.append(img);
      if (pendingUpload) {
        const status = document.createElement('small');
        status.textContent = 'Da caricare';
        item.append(status);
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'secondary';
      button.textContent = 'Rimuovi';
      button.setAttribute('aria-label', 'Rimuovi ' + label);
      button.addEventListener('click', onRemove);
      item.append(button);
      return item;
    }
    function render() {
      preview.replaceChildren();
      const saved = existing();
      saved.forEach((url, index) => {
        if (!/^https:\/\//i.test(url)) return;
        preview.append(tile(url, singular + ' salvata ' + (index + 1), 'Salvato', () => {
          const all = existing();
          all.splice(index, 1);
          links.value = all.join('\n');
          render();
        }, false));
      });
      pending.forEach((entry, index) => {
        preview.append(tile(entry.previewUrl, singular + ' da caricare ' + (index + 1), 'In attesa', () => remove(entry.file), true));
      });
      if (counter) {
        const total = saved.length + pending.length;
        counter.textContent = total + ' di ' + limit + ' ' + noun + ' (' + pending.length +
          (pending.length === 1 ? ' da caricare)' : ' da caricare)');
      }
    }
    input.addEventListener('change', () => {
      try {
        add(Array.from(input.files || []));
      } catch (error) {
        onError(error);
      } finally {
        // Android sostituisce FileList ad ogni apertura: svuotiamo il campo,
        // ma conserviamo gli oggetti File nella coda.
        input.value = '';
      }
    });
    links.addEventListener('input', render);
    render();
    return {files: () => pending.map(entry => entry.file), add, remove, clear, render, existing, replace: files => add(files, {replace:true})};
  }
  window.createScreenshotPicker = createScreenshotPicker;
})();
