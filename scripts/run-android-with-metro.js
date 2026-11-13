const net = require('net');
const { spawn, execSync } = require('child_process');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const port = 8081;

// Windows hardening: NoDefaultCurrentDirectoryInExePath=1 stops cmd from running
// a batch file by its bare name from the current directory. React Native CLI
// invokes `gradlew.bat` that way from android/, so install fails with
// "gradlew.bat is not recognized as an internal or external command" even though
// the file is present. Clearing it for this process (inherited by the Metro and
// run-android children) restores the build; explicit `.\gradlew.bat` also works.
if (process.platform === 'win32') {
  delete process.env.NoDefaultCurrentDirectoryInExePath;
}

function isPortOpen(host, portToCheck, timeoutMs = 500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const done = (result) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(result);
      }
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(portToCheck, host);
  });
}

async function waitForMetro(host, metroPort, maxWaitMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < maxWaitMs) {
    // eslint-disable-next-line no-await-in-loop
    const open = await isPortOpen(host, metroPort, 500);
    if (open) {
      return true;
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function startMetroProcess() {
  if (process.platform === 'win32') {
    spawn(
      'cmd.exe',
      [
        '/d',
        '/c',
        'start',
        '',
        '/d',
        projectRoot,
        'cmd.exe',
        '/k',
        `npx react-native start --reset-cache --port ${port}`,
      ],
      { cwd: projectRoot, detached: true, stdio: 'ignore', windowsHide: false }
    ).unref();
  } else {
    const metroProcess = spawn(
      'npx',
      ['react-native', 'start', '--reset-cache', '--port', String(port)],
      { cwd: projectRoot, detached: true, stdio: 'ignore' }
    );
    metroProcess.unref();
  }
}

async function ensureMetroRunning() {
  const alreadyRunning = await isPortOpen('127.0.0.1', port);
  if (alreadyRunning) {
    console.log(`Restarting existing Metro on port ${port}...`);
    try {
      stopMetroOnPort();
    } catch {
      // ignore — a flaky taskkill must not abort the build
    }
    // Wait for the port to actually free before starting a new Metro, otherwise
    // the fresh instance races the dying one and the launch fails.
    for (let i = 0; i < 20; i++) {
      // eslint-disable-next-line no-await-in-loop
      if (!(await isPortOpen('127.0.0.1', port, 300))) break;
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  console.log('Starting Metro with reset cache...');
  startMetroProcess();
  let ready = await waitForMetro('127.0.0.1', port, 30000);
  if (!ready) {
    // One retry: stop whatever is on the port and start fresh.
    console.log('Metro not ready, retrying once...');
    try {
      stopMetroOnPort();
    } catch {
      /* ignore */
    }
    await new Promise((r) => setTimeout(r, 1500));
    startMetroProcess();
    ready = await waitForMetro('127.0.0.1', port, 30000);
  }
  if (!ready) {
    throw new Error('Metro did not start within the timeout.');
  }
  console.log('Metro is running.');
}

function stopMetroOnPort() {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano -p tcp | findstr :${port}`, {
        stdio: ['ignore', 'pipe', 'ignore'],
      }).toString();

      const pids = Array.from(
        new Set(
          output
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => line.split(/\s+/).pop())
            .filter(Boolean)
        )
      );

      pids.forEach((pid) => {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
      });
      return;
    }

    const output = execSync(`lsof -ti tcp:${port}`, {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString();
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((pid) => {
        execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
      });
  } catch {
    // Nothing to stop.
  }
}

async function runAndroid() {
  await ensureMetroRunning();

  const runAndroidProcess =
    process.platform === 'win32'
      ? spawn('npx react-native run-android --no-packager', {
          cwd: projectRoot,
          stdio: 'inherit',
          shell: true,
        })
      : spawn('npx', ['react-native', 'run-android', '--no-packager'], {
          cwd: projectRoot,
          stdio: 'inherit',
        });

  runAndroidProcess.on('exit', (code) => {
    process.exit(code ?? 1);
  });
}

runAndroid().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
