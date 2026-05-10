const net = require('net');
const http = require('http');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const SYSTEMS = [
  { name: 'Empire Platform UI', type: 'http', host: 'localhost', port: 6969, path: '/' },
  { name: 'Empire Platform UI (Vite Default)', type: 'http', host: 'localhost', port: 5173, path: '/' },
  { name: 'Aegis Prototype UI', type: 'http', host: 'localhost', port: 7777, path: '/' },
  { name: 'Nginx (Glass Frontend)', type: 'http', host: 'localhost', port: 80, path: '/' },
  { name: 'FastAPI Analytics Engine', type: 'http', host: 'localhost', port: 8000, path: '/health' },
  { name: 'PostgreSQL Database', type: 'tcp', host: 'localhost', port: 5432 },
  { name: 'Redis Subsystems', type: 'tcp', host: 'localhost', port: 6379 },
  { name: 'Ollama Intelligence Engine', type: 'http', host: 'localhost', port: 11434, path: '/' },
];

function checkTcp(host, port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = 'down';

    socket.setTimeout(timeoutMs);
    socket.on('connect', () => {
      status = 'up';
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

function checkHttp(host, port, path, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const req = http.get({
      host,
      port,
      path,
      timeout: timeoutMs
    }, (res) => {
      // Any response indicates the server is up and responding
      resolve(true);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.on('error', () => {
      resolve(false);
    });
  });
}

async function runTests() {
  console.log(`\n${COLORS.bold}${COLORS.cyan}===========================================${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.cyan}   QUADRATIC SYSTEMS INTEGRATION TEST SUITE ${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.cyan}===========================================${COLORS.reset}\n`);

  let upCount = 0;
  let downCount = 0;
  const inactiveSystems = [];

  for (const sys of SYSTEMS) {
    process.stdout.write(`🛡️  Probing ${sys.name.padEnd(35)} [${sys.host}:${sys.port}] ... `);
    
    let isUp = false;
    try {
      if (sys.type === 'tcp') {
        isUp = await checkTcp(sys.host, sys.port);
      } else if (sys.type === 'http') {
        isUp = await checkHttp(sys.host, sys.port, sys.path);
      }
    } catch (e) {
      isUp = false;
    }

    if (isUp) {
      console.log(`[ ${COLORS.green}RESPONSIVE${COLORS.reset} ]`);
      upCount++;
    } else {
      console.log(`[ ${COLORS.red}UNREACHABLE${COLORS.reset} ]`);
      downCount++;
      inactiveSystems.push(sys.name);
    }
  }

  console.log(`\n${COLORS.bold}SYSTEM REPORT:${COLORS.reset}`);
  console.log(`✅ ${COLORS.green}${upCount} Systems Online${COLORS.reset}`);
  
  if (downCount > 0) {
    console.log(`❌ ${COLORS.red}${downCount} Systems Offline${COLORS.reset}`);
    console.log(`\n${COLORS.yellow}The following systems require attention or boot sequences:${COLORS.reset}`);
    inactiveSystems.forEach(sys => console.log(`   - ${sys}`));
  } else {
    console.log(`\n${COLORS.green}All Quadratic systems are fully operational.${COLORS.reset}`);
  }

  console.log('\n');
}

runTests();
