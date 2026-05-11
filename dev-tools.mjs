// dev-tools.mjs
// Ross 자체 개발 도구
// 코드 작성 → 실행 → 테스트 → 개선 → 반복

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

const DEV_DIR = path.join(os.homedir(), 'Desktop', 'ross-projects');
fs.mkdirSync(DEV_DIR, { recursive: true });

// 현재 실행 중인 프로세스들
const runningProcesses = new Map();

// ── 코드 실행 ─────────────────────────────────────────────────

export const devTools = {

  // 파일 생성
  createFile(filename, code) {
    const filePath = path.join(DEV_DIR, filename);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, code, 'utf-8');
    console.log(`📝 생성됨: ${filePath}`);
    return filePath;
  },

  // 파일 읽기
  readFile(filename) {
    const filePath = path.join(DEV_DIR, filename);
    return fs.readFileSync(filePath, 'utf-8');
  },

  // 프로젝트 목록
  listProjects() {
    try {
      return fs.readdirSync(DEV_DIR, { withFileTypes: true }).map(e => ({
        name: e.name,
        type: e.isDirectory() ? 'project' : 'file',
        path: path.join(DEV_DIR, e.name),
      }));
    } catch { return []; }
  },

  // Python 실행
  async runPython(filename, args = '') {
    const filePath = path.join(DEV_DIR, filename);
    try {
      const { stdout, stderr } = await execAsync(
        `python3 "${filePath}" ${args}`,
        { timeout: 30000, cwd: DEV_DIR }
      );
      return { success: true, output: stdout || stderr };
    } catch (err) {
      return { success: false, output: err.message };
    }
  },

  // Node.js 실행
  async runNode(filename, args = '') {
    const filePath = path.join(DEV_DIR, filename);
    try {
      const { stdout, stderr } = await execAsync(
        `node "${filePath}" ${args}`,
        { timeout: 30000, cwd: DEV_DIR }
      );
      return { success: true, output: stdout || stderr };
    } catch (err) {
      return { success: false, output: err.message };
    }
  },

  // 터미널 명령 실행
  async runCommand(command, cwd = DEV_DIR) {
    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 60000, cwd });
      return { success: true, output: (stdout + stderr).trim() };
    } catch (err) {
      return { success: false, output: err.stderr || err.message };
    }
  },

  // 백그라운드 프로세스 시작 (앱 실행용)
  startProcess(name, command, cwd = DEV_DIR) {
    // 기존 프로세스 종료
    if (runningProcesses.has(name)) {
      try { runningProcesses.get(name).kill(); } catch {}
    }

    const proc = spawn('bash', ['-c', command], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    proc.stdout.on('data', d => { output += d.toString(); });
    proc.stderr.on('data', d => { output += d.toString(); });

    runningProcesses.set(name, proc);
    console.log(`🚀 프로세스 시작: ${name} (PID: ${proc.pid})`);
    return { pid: proc.pid, name };
  },

  // 프로세스 중지
  stopProcess(name) {
    if (runningProcesses.has(name)) {
      try { runningProcesses.get(name).kill(); } catch {}
      runningProcesses.delete(name);
      return `${name} 중지됨`;
    }
    return `${name} 프로세스 없음`;
  },

  // 실행 중인 프로세스 목록
  listProcesses() {
    return Array.from(runningProcesses.keys());
  },

  // pip 패키지 설치
  async installPip(packages) {
    const pkgList = Array.isArray(packages) ? packages.join(' ') : packages;
    return await this.runCommand(`pip3 install ${pkgList}`);
  },

  // npm 패키지 설치
  async installNpm(packages, projectDir = DEV_DIR) {
    const pkgList = Array.isArray(packages) ? packages.join(' ') : packages;
    return await this.runCommand(`npm install ${pkgList}`, projectDir);
  },

  // HTML 파일 Safari에서 열기
  async openInBrowser(filename) {
    const filePath = path.join(DEV_DIR, filename);
    await execAsync(`open -a Safari "${filePath}"`);
    return `Safari에서 열림: ${filename}`;
  },

  // 코드 테스트 결과 분석
  analyzeOutput(output, expectedBehavior) {
    const hasError = output.toLowerCase().includes('error') ||
                     output.toLowerCase().includes('traceback') ||
                     output.toLowerCase().includes('exception');
    const hasWarning = output.toLowerCase().includes('warning');

    return {
      hasError,
      hasWarning,
      output,
      expectedBehavior,
      needsImprovement: hasError || output.trim() === '',
    };
  },

  // 프로젝트 디렉토리 경로
  getProjectDir() { return DEV_DIR; },
};

// ── Claude 도구 정의 ──────────────────────────────────────────

export const DEV_TOOLS_SCHEMA = [
  {
    name: 'create_code_file',
    description: 'Create a code file in the ross-projects folder. Use this to write Python, JavaScript, HTML, or any code.',
    input_schema: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'Filename with extension, e.g. motion_detector.py, app.html' },
        code:     { type: 'string', description: 'The complete code to write to the file' },
      },
      required: ['filename', 'code'],
    },
  },
  {
    name: 'run_python',
    description: 'Run a Python file from the ross-projects folder.',
    input_schema: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'Python filename to run' },
        args:     { type: 'string', description: 'Optional command line arguments' },
      },
      required: ['filename'],
    },
  },
  {
    name: 'run_node',
    description: 'Run a Node.js file from the ross-projects folder.',
    input_schema: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'Node.js filename to run' },
        args:     { type: 'string', description: 'Optional arguments' },
      },
      required: ['filename'],
    },
  },
  {
    name: 'run_command',
    description: 'Run a terminal command. Use for installing packages, running scripts, checking versions, etc.',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Terminal command to run' },
      },
      required: ['command'],
    },
  },
  {
    name: 'start_app',
    description: 'Start an application as a background process (e.g. a web server, a GUI app).',
    input_schema: {
      type: 'object',
      properties: {
        name:    { type: 'string', description: 'Process name for tracking' },
        command: { type: 'string', description: 'Command to start the app' },
      },
      required: ['name', 'command'],
    },
  },
  {
    name: 'stop_app',
    description: 'Stop a running background process.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Process name to stop' },
      },
      required: ['name'],
    },
  },
  {
    name: 'install_packages',
    description: 'Install Python (pip) or Node (npm) packages needed for the project.',
    input_schema: {
      type: 'object',
      properties: {
        manager:  { type: 'string', description: 'pip or npm' },
        packages: { type: 'string', description: 'Space-separated package names' },
      },
      required: ['manager', 'packages'],
    },
  },
  {
    name: 'open_in_browser',
    description: 'Open an HTML file in Safari browser.',
    input_schema: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'HTML filename to open' },
      },
      required: ['filename'],
    },
  },
  {
    name: 'read_project_file',
    description: 'Read the current code of a project file to review or modify it.',
    input_schema: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'Filename to read' },
      },
      required: ['filename'],
    },
  },
  {
    name: 'list_projects',
    description: 'List all projects and files in the ross-projects folder.',
    input_schema: { type: 'object', properties: {} },
  },
];

// ── 도구 실행 ─────────────────────────────────────────────────

export async function executeDevTool(name, input, onProgress) {
  const notify = (msg) => {
    console.log(`🔧 ${msg}`);
    onProgress?.(msg);
  };

  try {
    switch (name) {

      case 'create_code_file': {
        const filePath = devTools.createFile(input.filename, input.code);
        notify(`파일 생성됨: ${input.filename}`);
        return `Created: ${filePath}\n\nCode:\n${input.code.substring(0, 200)}...`;
      }

      case 'run_python': {
        notify(`Python 실행 중: ${input.filename}`);
        const result = await devTools.runPython(input.filename, input.args);
        notify(result.success ? '✅ 실행 완료' : '❌ 오류 발생');
        return result.output || (result.success ? 'Ran successfully' : 'Failed');
      }

      case 'run_node': {
        notify(`Node.js 실행 중: ${input.filename}`);
        const result = await devTools.runNode(input.filename, input.args);
        notify(result.success ? '✅ 실행 완료' : '❌ 오류 발생');
        return result.output || (result.success ? 'Ran successfully' : 'Failed');
      }

      case 'run_command': {
        notify(`명령 실행: ${input.command}`);
        const result = await devTools.runCommand(input.command);
        return result.output || (result.success ? 'Done' : 'Failed');
      }

      case 'start_app': {
        notify(`앱 시작: ${input.name}`);
        const proc = devTools.startProcess(input.name, input.command);
        await new Promise(r => setTimeout(r, 2000));
        return `Started ${input.name} (PID: ${proc.pid})`;
      }

      case 'stop_app': {
        const result = devTools.stopProcess(input.name);
        notify(result);
        return result;
      }

      case 'install_packages': {
        notify(`패키지 설치 중: ${input.packages}`);
        let result;
        if (input.manager === 'pip') {
          result = await devTools.installPip(input.packages);
        } else {
          result = await devTools.installNpm(input.packages);
        }
        notify(result.success ? '✅ 설치 완료' : '❌ 설치 실패');
        return result.output || 'Done';
      }

      case 'open_in_browser': {
        const result = await devTools.openInBrowser(input.filename);
        notify(result);
        return result;
      }

      case 'read_project_file': {
        const code = devTools.readFile(input.filename);
        return code;
      }

      case 'list_projects': {
        const projects = devTools.listProjects();
        return JSON.stringify(projects, null, 2);
      }

      default:
        return `Unknown dev tool: ${name}`;
    }
  } catch (err) {
    return `Error: ${err.message}`;
  }
}
