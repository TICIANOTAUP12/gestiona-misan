import { getAuthStorageKey, resetMockState, setupSupabaseMocks } from './supabase-mock';

declare global {
  namespace Cypress {
    interface Chainable {
      loginMock(options?: { failPagosPost?: boolean }): Chainable<void>;
      visitDashboard(options?: { failPagosPost?: boolean }): Chainable<void>;
      openCobroForCliente(nombre: string): Chainable<void>;
      fillCobroMonto(monto: string, descuento?: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginMock', (options) => {
  resetMockState();

  cy.fixture('clientes').then((clientes) => {
    cy.fixture('config').then((config) => {
      cy.fixture('pagos').then((pagos) => {
        setupSupabaseMocks({ clientes, pagos, config }, options);

        cy.fixture('auth-session').then((session) => {
          const storageValue = JSON.stringify({
            access_token: session.access_token,
            token_type: session.token_type,
            expires_in: session.expires_in,
            expires_at: session.expires_at,
            refresh_token: session.refresh_token,
            user: session.user,
          });

          cy.visit('/dashboard', {
            onBeforeLoad(win) {
              win.localStorage.setItem(getAuthStorageKey(), storageValue);
            },
          });

          cy.contains('Gestiona Cobros').should('be.visible');
          cy.get('[data-testid="cobro-btn-gestionar"]', { timeout: 15000 }).should(
            'have.length.at.least',
            1,
          );
        });
      });
    });
  });
});

Cypress.Commands.add('visitDashboard', (options) => {
  cy.loginMock(options);
});

Cypress.Commands.add('openCobroForCliente', (nombre) => {
  cy.get('table tbody tr').contains(nombre).parents('tr').find('[data-testid="cobro-btn-gestionar"]').click();
  cy.get('[data-testid="cobro-sheet"]').should('be.visible');
  cy.get('[data-testid="cobro-sheet"]').contains(nombre).should('be.visible');
});

function setReactInputValue(selector: string, value: string) {
  cy.get(selector).then(($el) => {
    const el = $el[0] as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

Cypress.Commands.add('fillCobroMonto', (monto: string, descuento?: string) => {
  setReactInputValue('[data-testid="cobro-input-monto"]', monto);
  if (descuento !== undefined) {
    setReactInputValue('[data-testid="cobro-input-descuento"]', descuento);
  }
});

export {};
