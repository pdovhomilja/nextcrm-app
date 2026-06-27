const fs = require('fs');
const path = require('path');

function generateReport() {
  const resultsPath = path.join(__dirname, '../results.json');
  const outputPath = path.join(__dirname, '../integration-report.md');

  if (!fs.existsSync(resultsPath)) {
    console.error('El archivo results.json no existe');
    process.exit(1);
  }

  const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  const testResults = results.testResults || [];

  const moduleMap = {
    auth: { title: 'Auth module', code: 'PIA' },
    accounts: { title: 'Accounts module', code: 'PIAC' },
    contacts: { title: 'Contacts module', code: 'PICO' },
    leads: { title: 'Leads module', code: 'PILE' },
    opportunities: { title: 'Opportunities module', code: 'PIOP' },
    contracts: { title: 'Contracts module', code: 'PICT' },
    activities: { title: 'Activities module', code: 'PIACT' },
    'audit-log': { title: 'Audit Log module', code: 'PIAL' },
    'soft-delete': { title: 'Soft Delete module', code: 'PISD' }
  };

  const modules = {};

  testResults.forEach(suite => {
    const parts = suite.name.split('/');
    const testIndex = parts.indexOf('integration');
    if (testIndex === -1 || testIndex + 1 >= parts.length) return;
    const moduleFolder = parts[testIndex + 1];

    if (!modules[moduleFolder]) {
      modules[moduleFolder] = {};
    }

    suite.assertionResults.forEach(test => {
      const suiteName = test.ancestorTitles[0] || path.basename(suite.name);
      if (!modules[moduleFolder][suiteName]) {
        modules[moduleFolder][suiteName] = [];
      }
      modules[moduleFolder][suiteName].push(test);
    });
  });

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function formatCell(val) {
    if (val === undefined || val === null || val === '') return '—';
    if (typeof val === 'object') {
      const prettySpaced = JSON.stringify(val, null, 2)
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ');
      return '`' + prettySpaced + '`';
    }
    return String(val);
  }

  let report = '# Informe de Pruebas de Integración\n\n';

  const orderedModuleKeys = Object.keys(modules).sort((a, b) => {
    if (a === 'auth') return -1;
    if (b === 'auth') return 1;
    if (a === 'accounts') return -1;
    if (b === 'accounts') return 1;
    return a.localeCompare(b);
  });

  orderedModuleKeys.forEach(moduleKey => {
    const info = moduleMap[moduleKey] || { title: moduleKey + ' module', code: moduleKey.toUpperCase() };
    report += `## ${info.title}: ${info.code}\n\n`;

    const suites = modules[moduleKey];
    Object.keys(suites).forEach(suiteName => {
      report += `### ${suiteName}\n\n`;

      suites[suiteName].forEach(test => {
        const meta = test.meta || {};
        const id = meta.id || 'N/A';
        const objective = meta.objective || 'Sin objetivo';
        const expectedStatus = meta.expectedStatus !== undefined ? meta.expectedStatus : 'Sin estado esperado';
        const notes = meta.notes || 'Ninguna';

        let method = 'Server Action';
        let endpointUrl = meta.endpoint || 'Desconocido';
        if (meta.endpoint && meta.endpoint.includes(' ')) {
          const endpointParts = meta.endpoint.split(' ');
          const firstWord = endpointParts[0].toUpperCase();
          if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(firstWord)) {
            method = firstWord;
            endpointUrl = endpointParts.slice(1).join(' ');
          } else if (meta.endpoint.startsWith('Server Action: ')) {
            method = 'Server Action';
            endpointUrl = meta.endpoint.replace('Server Action: ', '');
          }
        }

        const bodyStr = formatCell(meta.body);
        const paramsStr = formatCell(meta.params);
        const statusStr = test.status === 'passed' ? '🟢 Paso' : '🔴 Fallo';

        report += `#### ${capitalize(test.title)}\n\n`;
        report += '| Campo | Detalle |\n';
        report += '| :--- | :--- |\n';
        report += `| **ID** | ${id} |\n`;
        report += `| **Objetivo** | ${objective} |\n`;
        report += `| **Método** | ${method} |\n`;
        report += `| **Endpoint / Acción** | ${endpointUrl} |\n`;
        report += `| **Parámetros** | ${paramsStr} |\n`;
        report += `| **Body** | ${bodyStr} |\n`;
        report += `| **Resultado Esperado** | ${expectedStatus} |\n`;
        report += `| **Estado del test** | ${statusStr} |\n`;
        report += `| **Notas** | ${notes} |\n\n`;
      });
    });
  });

  fs.writeFileSync(outputPath, report, 'utf8');
  console.log(`Informe de pruebas de integración generado en ${outputPath}`);
}

generateReport();
