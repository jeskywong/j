const promptInput = document.getElementById('prompt');
const runBtn = document.getElementById('runBtn');
const output = document.getElementById('output');

runBtn.addEventListener('click', async () => {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    output.textContent = '请先输入 prompt。';
    return;
  }

  runBtn.disabled = true;
  runBtn.textContent = '运行中...';
  output.textContent = '请求中，请稍候...';

  try {
    const resp = await fetch('/api/run-workflow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    });

    const data = await resp.json();
    output.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    output.textContent = `请求失败：${err.message}`;
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = '运行工作流';
  }
});
