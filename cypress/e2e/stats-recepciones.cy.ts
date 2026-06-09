describe('Panel de estadísticas y recepciones', () => {
  beforeEach(() => {
    cy.loginMock();
  });

  it('muestra lista vacía cuando no hay pagos', () => {
    cy.get('[data-testid="stats-btn-abrir"]').click();
    cy.get('[data-testid="stats-panel"]').should('be.visible');
    cy.contains('No hay pagos registrados aún').should('be.visible');
  });

  it('muestra recepción tras registrar un cobro', () => {
    cy.openCobroForCliente('Cliente Vencido E2E');
    cy.get('[data-testid="cobro-btn-pago-total"]').click();
    cy.wait('@upsertPagos');
    cy.contains('[data-sonner-toast]', 'Pago total registrado').should('be.visible');

    cy.get('[data-testid="stats-btn-abrir"]').click();
    cy.get('[data-testid="stats-panel"]').should('be.visible');
    cy.get('[data-testid="stats-pago-item"]').should('have.length', 1);
    cy.get('[data-testid="stats-pago-item"]').first().scrollIntoView().within(() => {
      cy.contains('Cliente Vencido E2E').should('exist');
      cy.contains('$25.000').should('exist');
      cy.contains('Total').should('exist');
    });
  });

  it('muestra balance entre alias con dos receptores', () => {
    cy.openCobroForCliente('Cliente Vencido E2E');
    cy.contains('button', 'Alias 1').click();
    cy.get('[data-testid="cobro-btn-pago-total"]').click();
    cy.wait('@upsertPagos');

    cy.openCobroForCliente('Cliente Pendiente E2E');
    cy.contains('button', 'Alias 2').click();
    cy.fillCobroMonto('10000');
    cy.get('[data-testid="cobro-btn-pago-parcial"]').click();
    cy.wait('@upsertPagos');

    cy.get('[data-testid="stats-btn-abrir"]').click();
    cy.get('[data-testid="stats-panel"]').should('be.visible');
    cy.get('[data-testid="stats-panel"]').contains('Balance entre Alias').should('exist');
    cy.get('[data-testid="stats-panel"]').contains('GESTINA.COBROS').should('exist');
    cy.get('[data-testid="stats-panel"]').contains('GESTINA.COBROS2').should('exist');
  });

  it('elimina una recepción del historial', () => {
    cy.openCobroForCliente('Cliente Vencido E2E');
    cy.get('[data-testid="cobro-btn-pago-total"]').click();
    cy.wait('@upsertPagos');

    cy.get('[data-testid="stats-btn-abrir"]').click();
    cy.get('[data-testid="stats-pago-item"]').should('have.length', 1);

    cy.get('[data-testid="stats-btn-eliminar-pago"]').first().click({ force: true });
    cy.wait('@deletePago');
    cy.get('[data-testid="stats-pago-item"]').should('have.length', 0);
  });
});
