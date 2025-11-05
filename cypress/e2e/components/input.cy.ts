/// <reference types="cypress" />

describe("Input Component", () => {
  beforeEach(() => {
    cy.visit("/en/component-test");
  });

  context("Input Types", () => {
    it("should allow text input", () => {
      cy.get("#text-input").type("Hello, World!").should("have.value", "Hello, World!");
    });

    it("should allow email input", () => {
      cy.get("#email-input").type("test@example.com").should("have.value", "test@example.com");
    });

    it("should mask password input", () => {
      cy.get("#password-input").type("password123").should("have.value", "password123");
      cy.get("#password-input").should("have.attr", "type", "password");
    });

    it("should allow number input", () => {
      cy.get("#number-input").type("123").should("have.value", "123");
    });

    it("should allow date input", () => {
      cy.get("#date-input").type("2025-11-04").should("have.value", "2025-11-04");
    });

    it("should allow telephone number input", () => {
      cy.get("#tel-input").type("123-456-7890").should("have.value", "123-456-7890");
    });

    it("should allow search input", () => {
      cy.get("#search-input").type("search query").should("have.value", "search query");
    });
  });

  context("Input States", () => {
    it("should be disabled", () => {
      cy.get("#disabled-input").should("be.disabled");
    });

    it("should be read-only", () => {
      cy.get("#readonly-input").should("have.attr", "readonly");
    });

    it("should display an error state", () => {
      cy.get("#error-input").should("have.class", "border-destructive");
      cy.contains("This field is required.").should("be.visible");
    });
  });

  context("Accessibility", () => {
    it("should have a label associated with the input", () => {
      cy.get('label[for="text-input"]').should("be.visible");
    });

    it("should receive focus on tab", () => {
      cy.get("#text-input").focus().should("have.focus");
    });
  });
});
