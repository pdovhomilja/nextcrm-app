const fs = require('fs');
const path = require('path');

function generateWikiInforme() {
  const resultsPath = path.join(__dirname, '../results.json');
  const outputPath = path.join(__dirname, '../nextcrm-app.wiki/Informe-de-Pruebas-de-Integracion.md');

  if (!fs.existsSync(resultsPath)) {
    console.error('El archivo results.json no existe');
    process.exit(1);
  }

  const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  const testResults = results.testResults || [];

  const moduleMap = {
    auth: { title: 'Auth module', code: 'PIA', titleEs: 'Autenticación' },
    accounts: { title: 'Accounts module', code: 'PIAC', titleEs: 'Cuentas' },
    contacts: { title: 'Contacts module', code: 'PICO', titleEs: 'Contactos' },
    leads: { title: 'Leads module', code: 'PILE', titleEs: 'Leads' },
    opportunities: { title: 'Opportunities module', code: 'PIOP', titleEs: 'Oportunidades' },
    contracts: { title: 'Contracts module', code: 'PICT', titleEs: 'Contratos' },
    activities: { title: 'Activities module', code: 'PIACT', titleEs: 'Actividades' },
    'audit-log': { title: 'Audit Log module', code: 'PIAL', titleEs: 'Registro de auditoría' },
    'soft-delete': { title: 'Soft Delete module', code: 'PISD', titleEs: 'Eliminación lógica' },
    products: { title: 'Products module', code: 'PIPR', titleEs: 'Productos' }
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

  function escapeMarkdown(val) {
    if (typeof val !== 'string') return val;
    return val.replace(/\|/g, '\\|');
  }

  // Title translations: English test titles to Spanish
  const titleTranslations = {
    'returns a data payload with the new account id': 'Retornar identificador de la nueva cuenta al crearla con datos válidos',
    'persists the account row in crm_Accounts': 'Persistir la cuenta en crm_Accounts con los valores provistos',
    'writes an audit-log entry with action=created': 'Registrar entrada de auditoría con action=created',
    'dispatches the crm/account.saved inngest event (stubbed)': 'Enviar evento crm/account.saved a Inngest',
    'rejects creation with duplicate corporate email': 'Rechazar creación de cuenta con correo corporativo duplicado',
    'sets deletedAt and deletedBy on the row': 'Establecer deletedAt y deletedBy al eliminar lógicamente',
    'writes an audit-log entry with action=deleted': 'Registrar entrada de auditoría con action=deleted',
    'removes the account from getaccountbyid results': 'Excluir cuenta eliminada lógicamente de resultados de getAccountById',
    'rejects deleting an already deleted account': 'Rechazar eliminación de cuenta que ya fue eliminada lógicamente',
    'returns the account when it exists and is active': 'Retornar cuenta activa al consultarla por ID existente',
    'returns null for a non-existent id': 'Retornar nulo al buscar por ID inexistente',
    'returns null for a soft-deleted account': 'Retornar nulo al buscar cuenta eliminada lógicamente',
    'returns a { data: [{id, name}] } payload sorted by name asc': 'Retornar listado de cuentas ordenadas alfabéticamente ascendente',
    'includes the suite\'s fixture account in the listing': 'Incluir cuenta de pruebas en listado de cuentas activas',
    'excludes soft-deleted accounts': 'Excluir cuentas eliminadas lógicamente del listado',
    'returns success: true and clears deletedat/deletedby': 'Restaurar cuenta con rol admin, limpiar deletedAt/deletedBy',
    'writes an audit-log entry with action=restored': 'Registrar entrada de auditoría con action=restored',
    'makes the account visible via getaccountbyid again': 'Confirmar visibilidad de cuenta restaurada en consultas activas',
    'rejects the restore when the session user is not admin': 'Rechazar restauración cuando el usuario no es administrador',
    'rejects restoring an account that is not deleted': 'Rechazar restauración de cuenta que no se encuentra eliminada',
    'persists the new field values': 'Persistir nuevos valores modificados',
    'writes an audit-log entry with action=updated and a non-empty diff': 'Registrar entrada de auditoría con action=updated y diff de cambios',
    'watchaccount creates a row in accountwatchers': 'Registrar observación de cuenta en AccountWatchers',
    'unwatchaccount removes the row from accountwatchers': 'Eliminar registro de observación de cuenta en AccountWatchers',
    'rejects watching an account already being watched': 'Rechazar observación duplicada de cuenta',
    'returns a data payload with the new contact id': 'Retornar identificador del nuevo contacto al crearlo con datos válidos',
    'persists the contact row in crm_contacts': 'Persistir contacto en crm_Contacts con los valores provistos',
    'dispatches the crm/contact.saved inngest event': 'Enviar evento crm/contact.saved a Inngest',
    'maps empty string assigned_account to null instead of crashing postgresql': 'Convertir assigned_account vacío a nulo sin error en PostgreSQL',
    'rejects creation with non-existent assigned_account': 'Rechazar creación de contacto con cuenta asociada inexistente',
    'removes the contact from getcontact results': 'Excluir contacto eliminado lógicamente de resultados de getContact',
    'rejects restoring contact if its associated account is soft-deleted': 'Rechazar restauración de contacto si su cuenta asociada está eliminada',
    'returns the contact when it exists and is active': 'Retornar contacto activo al consultarlo por ID existente',
    'returns the active contacts associated with the account': 'Retornar contactos activos asociados a una cuenta específica',
    'excludes soft-deleted contacts from the list': 'Excluir contactos eliminados lógicamente del listado de la cuenta',
    'writes an audit-log entry with action=updated and diff': 'Registrar entrada de auditoría con action=updated y diff',
    'returns the generated accountid and contactid': 'Retornar identificadores de cuenta y contacto generados al convertir target',
    'creates a matching account in the database': 'Crear cuenta con datos de compañía al convertir target',
    'creates a matching contact in the database linked to the account': 'Crear contacto enlazado a la cuenta al convertir target',
    'updates the target to track conversion status': 'Actualizar target con identificadores de conversión para trazabilidad',
    'rejects conversion of an already converted target': 'Rechazar conversión de target ya convertido previamente',
    'rejects conversion of a non-existent or deleted target': 'Rechazar conversión de target inexistente o eliminado',
    'rejects associating a lead to a soft-deleted account': 'Rechazar vinculación de lead a cuenta eliminada lógicamente',
    'persists the lead row in crm_leads': 'Persistir lead en crm_Leads con los valores provistos',
    'dispatches the crm/lead.saved inngest event': 'Enviar evento crm/lead.saved a Inngest',
    'removes the lead from getlead results': 'Excluir lead eliminado lógicamente de resultados de getLead',
    'returns the lead when it exists and is active': 'Retornar lead activo al consultarlo por ID existente',
    'returns active leads including the suite\'s fixture lead': 'Retornar leads activos incluyendo el lead de pruebas',
    'excludes soft-deleted leads from the listing': 'Excluir leads eliminados lógicamente del listado',
    'updates the sales stage of the opportunity': 'Actualizar etapa de ventas de la oportunidad',
    'writes an audit-log entry tracking the stage change': 'Registrar entrada de auditoría al cambiar etapa de ventas',
    'sets the sales stage to closed lost': 'Cerrar oportunidad como perdida (Closed Lost)',
    'writes an audit log tracking the closed lost status': 'Registrar entrada de auditoría al cerrar oportunidad como perdida',
    'sets the sales stage to closed won': 'Cerrar oportunidad como ganada (Closed Won)',
    'writes an audit log tracking the closed won status': 'Registrar entrada de auditoría al cerrar oportunidad como ganada',
    'persists the opportunity row in crm_opportunities': 'Persistir oportunidad en crm_Opportunities con los valores provistos',
    'dispatches the crm/opportunity.saved inngest event': 'Enviar evento crm/opportunity.saved a Inngest',
    'returns the opportunity when it exists and is active': 'Retornar oportunidad activa al consultarla por ID existente',
    'returns null for a soft-deleted opportunity': 'Retornar nulo al buscar oportunidad eliminada lógicamente',
    'persists the line item in crm_contractlineitems with correct totals': 'Registrar partida de contrato con cálculos de totales correctos',
    'updates the parent contract value with the sum of line items': 'Actualizar valor total del contrato padre con suma acumulativa',
    'writes an audit-log entry for the contract line item': 'Registrar entrada de auditoría al crear partida de contrato',
    'successfully persists the contract row in crm_contracts': 'Persistir contrato correctamente en crm_Contracts',
    'creates an audit-log entry with action=created': 'Registrar entrada de auditoría con action=created al crear',
    'rejects creation with non-numeric value (nan injection)': 'Rechazar creación de contrato con valor no numérico',
    'rejects creation with currency length not equal to 3': 'Rechazar creación de contrato con moneda distinto de 3 caracteres',
    'rejects creation when enddate is before startdate': 'Rechazar creación de contrato con fecha de fin anterior a inicio',
    'rejects creation with negative value': 'Rechazar creación de contrato con valor negativo',
    'sets deletedat and deletedby on the contract': 'Establecer deletedAt y deletedBy al eliminar contrato lógicamente',
    'excludes the deleted contract from getcontract queries': 'Excluir contrato eliminado lógicamente de resultados de getContract',
    'returns the contract when it exists and is active': 'Retornar contrato activo al consultarlo por ID existente',
    'returns null for a soft-deleted contract': 'Retornar nulo al buscar contrato eliminado lógicamente',
    'persists the new field values in database': 'Persistir nuevos valores modificados del contrato en BD',
    'writes an audit-log entry with action=updated and diff changes': 'Registrar entrada de auditoría con action=updated y diff',
    'updates status to completed': 'Cambiar estado de actividad a completado',
    'updates status to cancelled': 'Cambiar estado de actividad a cancelado',
    'persists the activity row in database': 'Persistir actividad vinculada a múltiples entidades',
    'creates three links in crm_activitylinks pointing to account, contact, and opportunity': 'Registrar relaciones con múltiples entidades en tabla de enlaces',
    'persists the activity in crm_activities with correct fields': 'Persistir actividad de tipo nota vinculada a una única entidad',
    'persists a single link in crm_activitylinks': 'Registrar relación de actividad en tabla de enlaces',
    'rejects linking to a non-existent or soft-deleted entity': 'Rechazar vinculación de actividad a entidad inexistente o eliminada',
    'sets deletedat and deletedby in crm_activities': 'Registrar fecha y usuario al eliminar actividad lógicamente',
    'excludes the deleted activity from getactivitiesbyentity listing': 'Excluir actividad eliminada lógicamente de listados de la entidad',
    'returns active activities linked to the entity': 'Retornar actividades activas asociadas a una entidad específica',
    'excludes soft-deleted activities from the list': 'Excluir actividades eliminadas lógicamente del listado de la entidad',
    'returns an empty list for a non-existent entity': 'Retornar listado vacío al solicitar actividades para entidad inexistente',
    'lists activities in descending date order (newest first)': 'Retornar listado de actividades ordenado descendente por fecha',
    'does not include activities linked to other entities': 'Excluir del listado actividades asociadas a otras entidades',
    'persists updated fields in crm_activities': 'Persistir nuevos valores modificados de la actividad',
    'updates links by deleting old ones and adding the new ones': 'Actualizar enlaces eliminando anteriores e insertando nuevos',
    'persists a created audit log entry in database': 'Registrar entrada de auditoría al crear una cuenta',
    'persists an updated audit log entry in database with changes': 'Registrar diferencias de campos modificados tras actualizar cuenta',
    'filters audit log entries by entity type and id using getauditlogbyentity': 'Filtrar registro de auditoría por tipo e identificador de entidad',
    'filters audit log entries administratively using getauditlogadmin': 'Filtrar registro de auditoría administrativamente por tipo y usuario',
    'does not include the soft deleted account in active accounts listing': 'Excluir entidades eliminadas lógicamente de consultas generales',
    'clears deletedat and deletedby fields in database': 'Limpiar campos de eliminación lógica tras restaurar entidad',
    'includes the restored account in active accounts listing': 'Incluir entidad restaurada en consultas de entidades activas',
    'sets deletedat and deletedby fields on the account in database': 'Establecer fecha y usuario al eliminar entidad lógicamente',
    'rejects assignment of an inactive product': 'Rechazar asignación de producto inactivo',
    'rejects duplicate active product assignments': 'Rechazar asignación duplicada de producto con asignación activa',
    'get-session returns the user for a valid cookie': 'Retornar información de sesión con cookie válida',
    'get-session returns null/empty for a fabricated cookie': 'Retornar sesión nula con cookie inválida',
    'sign-in page is reachable with a valid cookie (no redirect loop)': 'Confirmar accesibilidad de página sign-in sin bucle de redirección',
    'the signed-in user has userstatus=active in the database': 'Confirmar que usuario autenticado tiene userStatus=ACTIVE en BD',
    'get-session returns null for a signed-out/closed session': 'Invalidar cookie de sesión tras cierre de sesión',
    'get-session returns the user matching the email': 'Obtener información del usuario con cookie válida',
    'returns the same user on a second get-session call (session is reusable)': 'Reutilizar cookie de sesión en segunda llamada consecutiva',
    'persists a session row in the database': 'Confirmar existencia de registro de sesión en BD',
    'captures the otp via the testutils plugin': 'Capturar código de verificación generado mediante mecanismo de pruebas',
    'persists a verification row for the requested email': 'Confirmar persistencia del registro de verificación con fecha de expiración',
    'rejects an obviously invalid email with 400': 'Rechazar correo con formato inválido',
    'rejects a missing type with 400': 'Rechazar solicitud sin tipo de operación',
    'rejects an invalid type with 400': 'Rechazar tipo de operación inválido en solicitud de OTP',
    'rejects an otp that does not match the captured value': 'Rechazar OTP que no coincide con el valor capturado',
    'rejects a non-numeric otp with 400': 'Rechazar OTP con caracteres no numéricos',
    'rejects an empty otp with 400': 'Rechazar OTP vacío',
    'rejects an otp for a non-registered email with 400 or 404': 'Rechazar OTP para correo no registrado',
    'rejects an expired otp with 400': 'Rechazar OTP expirado',
    'returns 200 when posting a valid email + type=sign-in': 'Solicitar código de verificación para correo registrado con tipo sign-in'
  };

  function translateTitle(title) {
    if (!title) return title;
    const lower = title.toLowerCase().trim();
    if (titleTranslations[lower]) {
      return titleTranslations[lower];
    }
    // Fallback: capitalize first letter
    return capitalize(title);
  }

  // Calculate statistics per module
  const stats = {};
  Object.keys(modules).forEach(moduleKey => {
    let total = 0;
    let passed = 0;
    let failed = 0;
    const suites = modules[moduleKey];
    Object.keys(suites).forEach(suiteName => {
      suites[suiteName].forEach(test => {
        total++;
        if (test.status === 'passed') {
          passed++;
        } else {
          failed++;
        }
      });
    });
    stats[moduleKey] = { total, passed, failed };
  });

  const moduleOrder = [
    'auth',
    'accounts',
    'contacts',
    'leads',
    'opportunities',
    'contracts',
    'activities',
    'audit-log',
    'soft-delete',
    'products'
  ];

  const orderedModuleKeys = Object.keys(modules).sort((a, b) => {
    const idxA = moduleOrder.indexOf(a);
    const idxB = moduleOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  // Calculate global stats
  let grandTotal = 0;
  let grandPassed = 0;
  let grandFailed = 0;
  orderedModuleKeys.forEach(moduleKey => {
    const s = stats[moduleKey] || { total: 0, passed: 0, failed: 0 };
    grandTotal += s.total;
    grandPassed += s.passed;
    grandFailed += s.failed;
  });
  const globalRate = grandTotal > 0 ? ((grandPassed / grandTotal) * 100).toFixed(1) : '0.0';

  // Collect failed tests for analysis
  const failedTests = [];
  orderedModuleKeys.forEach(moduleKey => {
    const suites = modules[moduleKey];
    Object.keys(suites).forEach(suiteName => {
      suites[suiteName].forEach(test => {
        if (test.status === 'failed') {
          const meta = test.meta || {};
          failedTests.push({
            module: moduleMap[moduleKey]?.titleEs || moduleKey,
            id: meta.id || 'N/A',
            title: test.title
          });
        }
      });
    });
  });

  // Start building the report
  let report = '';

  // Header
  report += '# Informe de Pruebas de Integración — NextCRM\n\n';
  report += '> **Equipo:** Pseudoxyops perpulchra\n';
  report += '> **Proyecto:** NextCRM · CRM open-source sobre Next.js 16 / React 19 / TypeScript / Prisma 7 / PostgreSQL\n';
  report += '> **Alcance de este documento:** resultados de las pruebas de integración del CRM básico, ejecutadas sobre base de datos real sin mocks internos.\n\n';
  report += '---\n\n';

  // Table of contents
  report += '## Tabla de contenidos\n\n';
  report += '- [1. Introducción](#1-introducción)\n';
  report += '  - [1.1 Propósito del documento](#11-propósito-del-documento)\n';
  report += '  - [1.2 Objetivos de las pruebas de integración](#12-objetivos-de-las-pruebas-de-integración)\n';
  report += '  - [1.3 Alcance](#13-alcance)\n';
  report += '  - [1.4 Limitaciones](#14-limitaciones)\n';
  report += '- [2. Referencias](#2-referencias)\n';
  report += '- [3. Configuración del entorno](#3-configuración-del-entorno)\n';
  report += '  - [3.1 Entorno técnico](#31-entorno-técnico)\n';
  report += '  - [3.2 Stack de pruebas](#32-stack-de-pruebas)\n';
  report += '  - [3.3 Estrategia de autenticación](#33-estrategia-de-autenticación)\n';
  report += '- [4. Estrategia de pruebas](#4-estrategia-de-pruebas)\n';
  report += '  - [4.1 Enfoque](#41-enfoque)\n';
  report += '  - [4.2 Criterios de aprobación](#42-criterios-de-aprobación)\n';
  report += '- [5. Ejecución y resultados](#5-ejecución-y-resultados)\n';
  report += '  - [5.1 Resumen general](#51-resumen-general)\n';
  orderedModuleKeys.forEach(moduleKey => {
    const info = moduleMap[moduleKey] || { titleEs: moduleKey, code: moduleKey.toUpperCase() };
    const sectionNum = orderedModuleKeys.indexOf(moduleKey) + 2;
    report += `  - [5.${sectionNum} ${info.titleEs} (${info.code})](#5${sectionNum}-${info.titleEs.toLowerCase().replace(/ /g, '-')}-${info.code.toLowerCase()})\n`;
  });
  report += '- [6. Análisis de resultados](#6-análisis-de-resultados)\n';
  report += '  - [6.1 Análisis por módulo](#61-análisis-por-módulo)\n';
  report += '  - [6.2 Principales incidencias globales](#62-principales-incidencias-globales)\n';
  report += '  - [6.3 Análisis general del sistema](#63-análisis-general-del-sistema)\n';
  report += '- [7. Conclusiones y recomendaciones](#7-conclusiones-y-recomendaciones)\n\n';
  report += '---\n\n';

  // Section 1: Introduction
  report += '## 1. Introducción\n\n';
  report += '### 1.1 Propósito del documento\n\n';
  report += 'NextCRM es un sistema de gestión de relaciones con el cliente (CRM) desarrollado sobre Next.js 16, React 19, TypeScript, Prisma ORM 7 y PostgreSQL 17. El sistema permite gestionar cuentas, contactos, leads, oportunidades comerciales, contratos y actividades de seguimiento, con autenticación basada en Better Auth y motor de auditoría integrado.\n\n';
  report += 'El presente informe documenta los resultados de las pruebas de integración ejecutadas sobre los módulos principales del CRM. A diferencia de las pruebas unitarias, que operan con dependencias mockeadas, las pruebas de integración validan la comunicación real entre Server Actions, base de datos PostgreSQL, motor de auditoría y sistema de autenticación, sin sustitución artificial de componentes.\n\n';

  report += '### 1.2 Objetivos de las pruebas de integración\n\n';
  report += 'Las pruebas de integración del CRM de NextCRM tuvieron como objetivos:\n\n';
  report += '- Validar la correcta persistencia de las entidades CRM en PostgreSQL real, incluyendo Accounts, Contacts, Leads, Opportunities, Contracts y Activities.\n';
  report += '- Verificar que el motor de auditoría registre correctamente los cambios realizados sobre cada entidad, incluyendo creaciones, actualizaciones y eliminaciones.\n';
  report += '- Confirmar que el sistema de autenticación Better Auth otorgue sesiones válidas y las invalide correctamente tras el cierre de sesión.\n';
  report += '- Comprobar que la eliminación lógica y su restauración operen sobre la base de datos de forma consistente.\n';
  report += '- Validar la integridad referencial entre entidades con relaciones cruzadas.\n';
  report += '- Detectar defectos de borde que las pruebas unitarias con mocks no descubren, tales como transacciones Prisma, orden de operaciones y restricciones de claves foráneas.\n\n';

  report += '### 1.3 Alcance\n\n';
  report += 'Las pruebas se ejecutaron sobre diez módulos del CRM básico:\n\n';
  report += '| Módulo | Prefijo | Pruebas ejecutadas |\n';
  report += '| --- | --- | --- |\n';
  orderedModuleKeys.forEach(moduleKey => {
    const info = moduleMap[moduleKey] || { titleEs: moduleKey, code: moduleKey.toUpperCase() };
    const s = stats[moduleKey] || { total: 0 };
    report += `| ${info.titleEs} | ${info.code} | ${s.total} |\n`;
  });
  report += `| **Total** | | **${grandTotal}** |\n\n`;
  report += 'Las operaciones evaluadas incluyen creación, consulta, actualización, eliminación lógica, restauración, conversión de leads, cambio de etapa de oportunidades, adición de partidas de contrato, vinculación polimórfica de actividades y asignación de productos.\n\n';

  report += '### 1.4 Limitaciones\n\n';
  report += 'Quedan explícitamente fuera del alcance de este informe:\n\n';
  report += '- Pruebas E2E con navegador (Playwright).\n';
  report += '- Pruebas de carga, estrés o rendimiento.\n';
  report += '- Pruebas de seguridad ofensiva (pentesting).\n';
  report += '- Módulos no CRM: Invoices, Projects, Documents, Email, Campaigns, Reports, MCP server, Inngest, búsqueda semántica con pgvector y enriquecimiento con E2B.\n';
  report += '- Pruebas de UI frontend, cubiertas por el informe de pruebas funcionales manuales.\n\n';
  report += '---\n\n';

  // Section 2: References
  report += '## 2. Referencias\n\n';
  report += '| Fuente | Descripción |\n';
  report += '| --- | --- |\n';
  report += '| ISO/IEC/IEEE 29119 | Estándar internacional para pruebas de software. |\n';
  report += '| Diseño de Pruebas de Integración de NextCRM | Documento de diseño con catálogo de 130 casos, estrategia Bottom-Up y matriz de trazabilidad. |\n';
  report += '| Plan de Pruebas de Integración de NextCRM | Documento de gestión de la fase de integración. |\n';
  report += '| Better Auth | Framework de autenticación con plugins de email OTP y admin. |\n';
  report += '| Prisma ORM | Cliente y migraciones para PostgreSQL. |\n';
  report += '| Next.js Server Actions | Convenciones de invocación y revalidación de caché. |\n';
  report += '| Vitest | Framework de pruebas unitarias y de integración. |\n';
  report += '| ky | Cliente HTTP minimalista basado en fetch. |\n\n';
  report += '---\n\n';

  // Section 3: Environment
  report += '## 3. Configuración del entorno\n\n';
  report += '### 3.1 Entorno técnico\n\n';
  report += '| Componente | Versión | Propósito |\n';
  report += '| --- | --- | --- |\n';
  report += '| Next.js | 16.2.6 | Framework de la aplicación |\n';
  report += '| React | 19.2.4 | Capa de UI |\n';
  report += '| TypeScript | 5.9.3 | Tipado estático |\n';
  report += '| Prisma ORM | 7.6 | ORM sobre PostgreSQL |\n';
  report += '| PostgreSQL | 17 | Base de datos relacional |\n';
  report += '| Better Auth | 1.6.2 | Autenticación |\n';
  report += '| Vitest | 4.1.8 | Test runner de integración |\n';
  report += '| Node | >= 22.12.0 | Runtime de Vitest y herramientas |\n';
  report += '| ky | ^2.0.2 | Cliente HTTP para los tests |\n\n';

  report += '### 3.2 Stack de pruebas\n\n';
  report += '- Vitest como test runner principal.\n';
  report += '- ky como cliente HTTP, elegido por su sintaxis concisa, hooks para extraer cookies, tipado fuerte con TypeScript y compatibilidad con fetch de Node 22 como alternativa nativa.\n';
  report += '- Base de datos real PostgreSQL expuesta en localhost:5432 mediante docker-compose.dev.yaml, sin mocks de Prisma ni de Better Auth.\n\n';

  report += '### 3.3 Estrategia de autenticación\n\n';
  report += 'El proyecto utiliza Better Auth con email OTP passwordless. Para que los tests obtengan una sesión válida sin enviar correos reales, se aprovecha la utilidad de captura OTP disponible solo en desarrollo:\n\n';
  report += '- Plugin activo solo en entornos dev y test: testUtils({ captureOTP: true }), definido en lib/auth.ts.\n';
  report += '- Endpoint de captura: GET /api/auth/test-otp?email=<email>, definido en app/api/auth/test-otp/route.ts.\n';
  report += '- Helper de autenticación: tests/integration/helpers/auth.ts, que encapsula el flujo de obtención de cookie.\n\n';
  report += 'Requisito: la variable de entorno NODE_ENV debe ser distinta de production y TEST_USER_EMAIL debe apuntar a un usuario válido con userStatus igual a ACTIVE.\n\n';
  report += '---\n\n';

  // Section 4: Strategy
  report += '## 4. Estrategia de pruebas\n\n';
  report += '### 4.1 Enfoque\n\n';
  report += 'Se adopta un enfoque Bottom-Up combinado con aislamiento por módulo:\n\n';
  report += '1. Nivel 0 (datos base): fixtures iniciales creados por setup.ts (usuario admin, cuenta, contacto, lead, oportunidad, contrato y actividad base).\n';
  report += '2. Nivel 1 (operaciones sin dependencias cruzadas): CRUD básico de cada entidad (PIAC, PICO, PILE, PIOP, PICT).\n';
  report += '3. Nivel 2 (operaciones compuestas): conversión de Lead, multi-link de Activity y restauración.\n';
  report += '4. Nivel 3 (transversal): Audit Log y Soft Delete, que verifican la integridad del patrón a través de todas las entidades.\n\n';
  report += 'Orden de ejecución dentro de la suite: PIA, PIAC, PICO, PILE, PIOP, PICT, PIACT, PIAL y PISD.\n\n';

  report += '### 4.2 Criterios de aprobación\n\n';
  report += 'Cada caso de prueba se clasifica en una de tres estados:\n\n';
  report += '- Aprobado: la Server Action o API Route retorna el resultado esperado, los datos se persisten correctamente en PostgreSQL, y el Audit Log registra la entrada correspondiente cuando aplique.\n';
  report += '- Observación: la API responde correctamente pero con un comportamiento ambiguo, por ejemplo, devuelve 200 cuando la convención sugeriría un código diferente, o el mensaje no distingue entre creación y actualización.\n';
  report += '- Fallo: la Server Action retorna error cuando se esperaba éxito, la base de datos no refleja los cambios, o se produce un error no controlado.\n\n';
  report += '---\n\n';

  // Section 5: Results
  report += '## 5. Ejecución y resultados\n\n';

  // 5.1 Summary table
  report += '### 5.1 Resumen general\n\n';
  report += '| Módulo | Pruebas totales | Aprobadas | Fallidas | Tasa de éxito |\n';
  report += '| --- | :---: | :---: | :---: | :---: |\n';
  orderedModuleKeys.forEach(moduleKey => {
    const info = moduleMap[moduleKey] || { titleEs: moduleKey, code: moduleKey.toUpperCase() };
    const s = stats[moduleKey] || { total: 0, passed: 0, failed: 0 };
    const rate = s.total > 0 ? ((s.passed / s.total) * 100).toFixed(1) : '0.0';
    report += `| ${info.titleEs} (${info.code}) | ${s.total} | ${s.passed} | ${s.failed} | ${rate}% |\n`;
  });
  report += `| **Total** | **${grandTotal}** | **${grandPassed}** | **${grandFailed}** | **${globalRate}%** |\n\n`;
  report += '---\n\n';

  // 5.X Individual modules with individual tables per test
  orderedModuleKeys.forEach(moduleKey => {
    const info = moduleMap[moduleKey] || { titleEs: moduleKey, code: moduleKey.toUpperCase() };
    const sectionNum = orderedModuleKeys.indexOf(moduleKey) + 2;
    const s = stats[moduleKey] || { total: 0, passed: 0, failed: 0 };
    const suites = modules[moduleKey];

    report += `### 5.${sectionNum} ${info.titleEs} (${info.code})\n\n`;

    // Module description
    const descriptions = {
      auth: 'El módulo de autenticación valida el flujo de Better Auth basado en email OTP: solicitud de código de verificación, verificación del OTP, obtención y reutilización de sesión, y rechazo de credenciales inválidas.',
      accounts: 'El módulo de cuentas cubre el ciclo de vida completo: creación, consulta, actualización, eliminación lógica, restauración por administrador, gestión de observadores y listados ordenados.',
      contacts: 'El módulo de contactos valida la creación, consulta, actualización, eliminación lógica y listado de contactos asociados a cuentas.',
      leads: 'El módulo de leads valida la creación, consulta, actualización, eliminación lógica y conversión de un target en cuenta y contacto.',
      opportunities: 'El módulo de oportunidades cubre la creación, consulta, actualización, cambio de etapa de ventas y cierre (ganado o perdido).',
      contracts: 'El módulo de contratos valida la creación, consulta, actualización, eliminación lógica y adición de partidas de contrato con cálculo de totales acumulados.',
      activities: 'El módulo de actividades valida la creación con vínculo polimórfico a una o varias entidades, consulta por entidad, actualización, cambio de estado y eliminación lógica.',
      'audit-log': 'El módulo de auditoría verifica el registro detallado de eventos para creación, modificación y las búsquedas históricas por entidad y por usuario.',
      'soft-delete': 'El módulo transversal de eliminación lógica verifica que el patrón de borrado lógico y restauración opere correctamente en todas las entidades del CRM.',
      products: 'El módulo de productos valida las restricciones de asignación de productos a cuentas, incluyendo restricciones de estado y unicidad.'
    };

    report += `${descriptions[moduleKey] || ''}\n\n`;

    // Individual table per test
    Object.keys(suites).forEach(suiteName => {
      // Individual table per test (no suite-level heading)

      suites[suiteName].forEach(test => {
        const meta = test.meta || {};
        const id = meta.id || 'N/A';
        const expectedStatus = meta.expectedStatus !== undefined ? meta.expectedStatus : 'Sin resultado esperado';

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
        const statusStr = test.status === 'passed' ? 'Aprobado' : 'Fallo';
        const resultStr = test.status === 'passed' ? escapeMarkdown(expectedStatus) : (test.failureMessages?.[0]?.split('\n')[0] || 'Error');
        const translatedTitle = translateTitle(test.title);

        report += `#### ${translatedTitle}\n\n`;
        report += `| Campo | Detalle |\n`;
        report += `| :--- | :--- |\n`;
        report += `| **ID** | ${id} |\n`;
        report += `| **Método** | ${method} |\n`;
        report += `| **Endpoint / Acción** | ${endpointUrl} |\n`;
        report += `| **Parámetros de entrada** | ${paramsStr !== '—' ? paramsStr : bodyStr !== '—' ? bodyStr : '—'} |\n`;
        report += `| **Resultado esperado** | ${escapeMarkdown(expectedStatus)} |\n`;
        report += `| **Resultado obtenido** | ${escapeMarkdown(resultStr)} |\n`;
        report += `| **Estado** | ${statusStr} |\n\n`;
      });
    });

    report += '---\n\n';
  });

  // Section 6: Analysis
  report += '## 6. Análisis de resultados\n\n';

  report += '### 6.1 Análisis por módulo\n\n';

  orderedModuleKeys.forEach(moduleKey => {
    const info = moduleMap[moduleKey] || { titleEs: moduleKey, code: moduleKey.toUpperCase() };
    const s = stats[moduleKey] || { total: 0, passed: 0, failed: 0 };
    const rate = s.total > 0 ? ((s.passed / s.total) * 100).toFixed(1) : '0.0';

    report += `**${info.titleEs} (${info.code}): ${s.passed} aprobados, ${s.failed} fallidos de ${s.total} casos (${rate}%).**\n\n`;

    // Collect failed test details for this module
    const moduleFailed = [];
    const suites = modules[moduleKey];
    Object.keys(suites).forEach(suiteName => {
      suites[suiteName].forEach(test => {
        if (test.status === 'failed') {
          const meta = test.meta || {};
          moduleFailed.push({ id: meta.id, title: test.title });
        }
      });
    });

    if (moduleFailed.length === 0) {
      report += 'El módulo alcanzó el 100% de aprobación. Todas las operaciones evaluadas funcionaron correctamente.\n\n';
    } else {
      report += 'Los fallos detectados son:\n\n';
      moduleFailed.forEach(ft => {
        const translatedFailTitle = translateTitle(ft.title);
        report += `- ${ft.id}: ${translatedFailTitle}.\n`;
      });
      report += '\n';
    }
  });

  report += '### 6.2 Principales incidencias globales\n\n';

  // Categorize failures
  const integrityFails = [];
  const uniquenessFails = [];
  const validationFails = [];
  const sessionFails = [];

  failedTests.forEach(ft => {
    const id = ft.id;
    if (id.startsWith('PIAC-026') || id.startsWith('PIAC-030')) {
      uniquenessFails.push(ft);
    } else if (id.startsWith('PICT-015') || id.startsWith('PICT-016') || id.startsWith('PICT-017')) {
      validationFails.push(ft);
    } else if (id.startsWith('PIA-019')) {
      sessionFails.push(ft);
    } else {
      integrityFails.push(ft);
    }
  });

  report += '1. **Validación de integridad referencial ausente.** ';
  if (integrityFails.length > 0) {
    report += `${integrityFails.length} fallos corresponden a la no validación de la existencia o estado activo de entidades relacionadas antes de crear, restaurar o vincular registros. Los casos afectados son: ${integrityFails.map(f => f.id).join(', ')}.\n\n`;
  }

  report += '2. **Restricciones de unicidad faltantes.** ';
  if (uniquenessFails.length > 0) {
    const word = uniquenessFails.length === 1 ? 'fallo indica' : 'fallos indican';
    report += `${uniquenessFails.length} ${word} que el esquema de Prisma no define restricciones de unicidad para campos que deberían ser únicos, como el correo corporativo de cuentas o la relación account-watcher. Casos: ${uniquenessFails.map(f => f.id).join(', ')}.\n\n`;
  }

  report += '3. **Validaciones de negocio ausentes en Contracts.** ';
  if (validationFails.length > 0) {
    const word = validationFails.length === 1 ? 'fallo revela' : 'fallos revelan';
    report += `${validationFails.length} ${word} que la Server Action createNewContract no aplica validaciones básicas sobre formato de moneda, coherencia de fechas ni rango de valores numéricos. Casos: ${validationFails.map(f => f.id).join(', ')}.\n\n`;
  }

  report += '4. **Invalidación de sesión incompleta.** ';
  if (sessionFails.length > 0) {
    report += `El fallo ${sessionFails[0].id} indica que la operación sign-out no revierte efectivamente la cookie de sesión, lo que representa un riesgo de seguridad en producción.\n\n`;
  }

  report += '### 6.3 Análisis general del sistema\n\n';
  report += `El CRM de NextCRM demostró una estabilidad general del ${globalRate}% en las pruebas de integración, con ${grandPassed} de ${grandTotal} casos aprobados. `;
  report += 'Los módulos que alcanzaron el 100% de aprobación reflejan una implementación sólida en áreas críticas del sistema.\n\n';
  report += 'Los fallos se concentran en validaciones de borde y restricciones de integridad, no en la lógica central del CRM. Esto sugiere que las Server Actions funcionan correctamente para los flujos felices, pero requieren reforzamiento en la validación de precondiciones antes de ejecutar mutaciones sobre la base de datos.\n\n';
  report += `La tasa de éxito del ${globalRate}% ${parseFloat(globalRate) >= 90 ? 'supera' : 'no alcanza'} el umbral mínimo del 90% establecido en los criterios de finalización del diseño. `;
  report += `Los ${grandFailed} fallos detectados corresponden a defectos reales que deben ser corregidos antes del despliegue en producción, ya que afectan la integridad referencial y la seguridad de las sesiones.\n\n`;
  report += '---\n\n';

  // Section 7: Conclusions
  report += '## 7. Conclusiones y recomendaciones\n\n';
  report += 'Las pruebas de integración permitieron validar que la Web API del CRM cumple satisfactoriamente con su función principal de persistir, consultar y mutar datos en PostgreSQL real. ';
  report += 'Los módulos que operaron sin defectos reflejan una implementación sólida en áreas críticas del sistema.\n\n';
  report += `Sin embargo, se identificaron ${grandFailed} defectos distribuidos en múltiples módulos, concentrados en tres patrones:\n\n`;
  report += '1. Falta de validación de integridad referencial antes de crear, restaurar o vincular entidades con relaciones cruzadas.\n';
  report += '2. Ausencia de restricciones de unicidad en el esquema de Prisma para campos que deben ser únicos.\n';
  report += '3. Validaciones de negocio incompletas en la creación de contratos.\n\n';
  report += 'Como recomendaciones se sugiere:\n\n';
  report += '- Implementar validación de integridad referencial en todas las Server Actions que crean o restauran entidades con relaciones, verificando que la entidad relacionada exista y se encuentre en estado activo antes de ejecutar la mutación.\n';
  report += '- Definir restricciones de unicidad en el esquema de Prisma para el correo corporativo de cuentas y la relación account-watcher, evitando duplicados a nivel de base de datos.\n';
  report += '- Agregar validaciones de negocio en createNewContract para código de moneda (longitud exacta de 3 caracteres), orden de fechas (inicio menor o igual a fin) y rango de valores (mayor o igual a cero).\n';
  report += '- Corregir la invalidación de sesión en la operación sign-out para que la cookie de sesión pierda efectividad de forma inmediata.\n';
  report += '- Mantener la ejecución de la suite de integración en CI para detectar regresiones en cada Pull Request.\n';

  fs.writeFileSync(outputPath, report, 'utf8');
  console.log(`Informe de pruebas de integración generado en ${outputPath}`);
  console.log(`Total: ${grandTotal} pruebas, ${grandPassed} aprobadas, ${grandFailed} fallidas (${globalRate}% éxito)`);
}

generateWikiInforme();
