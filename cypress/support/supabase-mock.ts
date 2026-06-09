type ClienteRow = {
  id: string;
  nombre: string;
  telefono: string;
  cantidad_sistemas: number;
  monto_cuota: number;
  saldo: number;
  metodo_pago: string;
  estado: string;
  mensaje_vencimiento: string | null;
  mensaje_pago_pendiente: string | null;
  fecha_vencimiento: string | null;
};

type PagoRow = {
  id: string;
  cliente_id: string;
  cliente_nombre: string;
  monto: number;
  monto_original: number;
  descuento: number;
  fecha: string;
  alias: string;
  tipo: string;
  es_cuota_mensual: boolean;
};

const PROJECT_REF = 'qhdxtwargzpjljytqlvm';
const AUTH_STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;

type MockState = {
  clientes: ClienteRow[];
  pagos: PagoRow[];
  config: Record<string, unknown>;
};

let mockState: MockState = {
  clientes: [],
  pagos: [],
  config: {},
};

type MockInitialData = {
  clientes: ClienteRow[];
  pagos: PagoRow[];
  config: Record<string, unknown>;
};

function parseBody<T>(body: T | string): T {
  if (typeof body === 'string') {
    return JSON.parse(body) as T;
  }
  return body;
}

function upsertClientes(rows: ClienteRow[]) {
  for (const row of rows) {
    const index = mockState.clientes.findIndex((c) => c.id === row.id);
    if (index >= 0) {
      mockState.clientes[index] = { ...mockState.clientes[index], ...row };
    } else {
      mockState.clientes.push(row);
    }
  }
}

function upsertPagos(rows: PagoRow[]) {
  for (const row of rows) {
    const index = mockState.pagos.findIndex((p) => p.id === row.id);
    if (index >= 0) {
      mockState.pagos[index] = { ...mockState.pagos[index], ...row };
    } else {
      mockState.pagos.push(row);
    }
  }
}

export function resetMockState() {
  mockState = { clientes: [], pagos: [], config: {} };
}

export function getMockPagos() {
  return [...mockState.pagos];
}

export function getAuthStorageKey() {
  return AUTH_STORAGE_KEY;
}

export function setupSupabaseMocks(
  initial: MockInitialData,
  options?: { failPagosPost?: boolean },
) {
  mockState.clientes = [...initial.clientes];
  mockState.pagos = [...initial.pagos];
  mockState.config = { ...initial.config };

  cy.intercept('POST', '**/auth/v1/token*', (req) => {
    req.reply({ fixture: 'auth-session.json' });
  }).as('authLogin');

  cy.intercept('GET', '**/auth/v1/user', {
    statusCode: 200,
    body: {
      id: 'e2e-user-id',
      email: 'gestiona@misan.com',
      role: 'authenticated',
      aud: 'authenticated',
    },
  });

  cy.intercept('GET', '**/rest/v1/clientes*', (req) => {
    req.reply({
      statusCode: 200,
      body: [...mockState.clientes].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    });
  }).as('getClientes');

  cy.intercept('POST', '**/rest/v1/clientes*', (req) => {
    const rows = parseBody<ClienteRow | ClienteRow[]>(req.body);
    const list = Array.isArray(rows) ? rows : [rows];
    upsertClientes(list);
    req.reply({ statusCode: 201, body: list });
  }).as('upsertClientes');

  cy.intercept('PATCH', '**/rest/v1/clientes*', (req) => {
    const rows = parseBody<ClienteRow | ClienteRow[]>(req.body);
    const list = Array.isArray(rows) ? rows : [rows];
    upsertClientes(list);
    req.reply({ statusCode: 200, body: list });
  });

  cy.intercept('DELETE', '**/rest/v1/clientes*', (req) => {
    const url = new URL(req.url);
    const idFilter = url.searchParams.get('id');
    if (idFilter?.startsWith('eq.')) {
      const id = idFilter.slice(3);
      mockState.clientes = mockState.clientes.filter((c) => c.id !== id);
    }
    req.reply({ statusCode: 204, body: '' });
  });

  cy.intercept('GET', '**/rest/v1/pagos*', (req) => {
    const sorted = [...mockState.pagos].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
    );
    req.reply({ statusCode: 200, body: sorted });
  }).as('getPagos');

  cy.intercept('POST', '**/rest/v1/pagos*', (req) => {
    if (options?.failPagosPost) {
      req.reply({ statusCode: 500, body: { message: 'Mock payment failure' } });
      return;
    }
    const rows = parseBody<PagoRow | PagoRow[]>(req.body);
    const list = Array.isArray(rows) ? rows : [rows];
    upsertPagos(list);
    req.reply({ statusCode: 201, body: list });
  }).as('upsertPagos');

  cy.intercept('PATCH', '**/rest/v1/pagos*', (req) => {
    const rows = parseBody<PagoRow | PagoRow[]>(req.body);
    const list = Array.isArray(rows) ? rows : [rows];
    upsertPagos(list);
    req.reply({ statusCode: 200, body: list });
  });

  cy.intercept({ method: 'DELETE', url: '**/rest/v1/pagos**' }, (req) => {
    const idMatch = req.url.match(/id=eq\.([^&]+)/);
    let deleted: PagoRow[] = [];
    if (idMatch) {
      const rawId = decodeURIComponent(idMatch[1]).replace(/^"|"$/g, '');
      deleted = mockState.pagos.filter((p) => p.id === rawId);
      mockState.pagos = mockState.pagos.filter((p) => p.id !== rawId);
    }
    req.reply({ statusCode: 200, body: deleted });
  }).as('deletePago');

  cy.intercept('GET', '**/rest/v1/configuracion*', (req) => {
    req.reply({ statusCode: 200, body: mockState.config });
  }).as('getConfig');

  cy.intercept('POST', '**/rest/v1/configuracion*', (req) => {
    const row = parseBody<Record<string, unknown> | Record<string, unknown>[]>(req.body);
    const list = Array.isArray(row) ? row[0] : row;
    mockState.config = { ...mockState.config, ...list };
    req.reply({ statusCode: 201, body: mockState.config });
  });

  cy.intercept('PATCH', '**/rest/v1/configuracion*', (req) => {
    const row = parseBody<Record<string, unknown> | Record<string, unknown>[]>(req.body);
    const list = Array.isArray(row) ? row[0] : row;
    mockState.config = { ...mockState.config, ...list };
    req.reply({ statusCode: 200, body: mockState.config });
  });
}
