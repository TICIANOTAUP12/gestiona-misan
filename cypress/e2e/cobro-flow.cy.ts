describe('Flujo de gestión de cobro', () => {
  beforeEach(() => {
    cy.loginMock();
  });

  it('abre el panel de deuda con resumen del cliente', () => {
    cy.openCobroForCliente('Cliente Vencido E2E');
    cy.get('[data-testid="cobro-saldo-pendiente"]').should('contain', '25.000');
  });

  it('registra pago total y actualiza saldo a cero', () => {
    cy.openCobroForCliente('Cliente Vencido E2E');
    cy.get('[data-testid="cobro-btn-pago-total"]').click();

    cy.wait('@upsertClientes');
    cy.wait('@upsertPagos').then((interception) => {
      const body = interception.request.body;
      const pago = Array.isArray(body) ? body[0] : body;
      expect(pago.tipo).to.eq('total');
      expect(pago.cliente_id).to.eq('e2e-1');
      expect(Number(pago.monto)).to.eq(25000);
    });

    cy.contains('[data-sonner-toast]', 'Pago total registrado').should('be.visible');
    cy.get('[data-testid="cobro-sheet"]').should('not.be.visible');
    cy.contains('tr', 'Cliente Vencido E2E').within(() => {
      cy.contains('$0').should('be.visible');
      cy.contains('Al día').should('be.visible');
    });
  });

  it('registra pago parcial con descuento', () => {
    cy.openCobroForCliente('Cliente Pendiente E2E');

    cy.fillCobroMonto('5000', '10');
    cy.get('[data-testid="cobro-btn-pago-parcial"]').click();

    cy.wait('@upsertPagos').then((interception) => {
      const body = interception.request.body;
      const pago = Array.isArray(body) ? body[0] : body;
      expect(pago.tipo).to.eq('parcial');
      expect(Number(pago.monto)).to.eq(4500);
      expect(Number(pago.descuento)).to.eq(10);
    });

    cy.contains('[data-sonner-toast]', 'Pago de $4.500 registrado').should('be.visible');
    cy.contains('tr', 'Cliente Pendiente E2E').within(() => {
      cy.contains('$5.500').should('be.visible');
    });
  });

  it('registra pago de cuota mensual cuando saldo es cero', () => {
    cy.openCobroForCliente('Cliente Al Dia E2E');
    cy.get('[data-testid="cobro-saldo-pendiente"]').should('contain', '12.500');
    cy.get('[data-testid="cobro-btn-pago-total"]').click();

    cy.wait('@upsertPagos').then((interception) => {
      const body = interception.request.body;
      const pago = Array.isArray(body) ? body[0] : body;
      expect(pago.es_cuota_mensual).to.eq(true);
      expect(Number(pago.monto)).to.eq(12500);
    });

    cy.contains('[data-sonner-toast]', 'Pago total registrado').should('be.visible');
  });

  it('actualiza el estado del cliente', () => {
    cy.openCobroForCliente('Cliente Pendiente E2E');

    cy.get('[data-testid="cobro-select-estado"]').scrollIntoView().click({ force: true });
    cy.get('[data-testid="cobro-estado-al-dia"]').click({ force: true });
    cy.get('[data-testid="cobro-btn-actualizar-estado"]').should('not.be.disabled').click();

    cy.wait('@upsertClientes');
    cy.contains('tr', 'Cliente Pendiente E2E').contains('Al día').should('be.visible');
  });

});

describe('Regresión de error al registrar pago', () => {
  it('muestra error y mantiene el panel abierto si falla el registro de pago', () => {
    cy.loginMock();
    cy.openCobroForCliente('Cliente Vencido E2E');
    cy.intercept('POST', '**/rest/v1/pagos**', {
      statusCode: 500,
      body: { code: '500', message: 'Mock payment failure', details: null, hint: null },
    }).as('failPago');
    cy.get('[data-testid="cobro-btn-pago-total"]').click();
    cy.wait('@failPago');

    cy.get('[data-testid="cobro-sheet"]').should('be.visible');
    cy.get('[data-testid="cobro-saldo-pendiente"]').should('contain', '25.000');
    cy.contains('tr', 'Cliente Vencido E2E').contains('$25.000').should('be.visible');
  });
});

describe('WhatsApp en cobro', () => {
  beforeEach(() => {
    cy.loginMock();
  });

  it('abre WhatsApp con mensaje codificado', () => {
    cy.openCobroForCliente('Cliente Vencido E2E');

    cy.window().then((win) => {
      cy.stub(win, 'open').as('windowOpen');
    });

    cy.get('[data-testid="cobro-btn-whatsapp"]').click();
    cy.get('@windowOpen').should('have.been.called');
    cy.get('@windowOpen')
      .invoke('getCall', 0)
      .its('args.0')
      .should('include', 'wa.me/5491112345678')
      .and('include', 'text=');
  });
});
