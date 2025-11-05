/// <reference types="cypress" />

describe("Button Component", () => {
  beforeEach(() => {
    cy.visit("/en/component-test");
  });

  context("Variants", () => {
    it("should render the primary button correctly", () => {
      cy.contains("Primary").should("be.visible").and("have.class", "bg-primary");
    });

    it("should render the secondary button correctly", () => {
      cy.contains("Secondary").should("be.visible").and("have.class", "bg-secondary");
    });

    it("should render the outline button correctly", () => {
      cy.contains("Outline").should("be.visible").and("have.class", "border");
    });

    it("should render the ghost button correctly", () => {
      cy.contains("Ghost").should("be.visible");
    });

    it("should render the destructive button correctly", () => {
      cy.contains("Destructive").should("be.visible").and("have.class", "bg-destructive");
    });
  });

  context("States", () => {
    it("should render the disabled button correctly", () => {
      cy.contains("Disabled").should("be.visible").and("be.disabled");
    });

    it("should render the loading button correctly", () => {
      cy.contains("Loading").should("be.visible").find("svg").should("have.class", "animate-spin");
    });
  });

  context("Sizes", () => {
    it("should render the small button correctly", () => {
      cy.contains("Small").should("be.visible").and("have.class", "h-9");
    });

    it("should render the default button correctly", () => {
      cy.contains("Default").should("be.visible").and("have.class", "h-10");
    });

    it("should render the large button correctly", () => {
      cy.contains("Large").should("be.visible").and("have.class", "h-11");
    });

    it("should render the icon button correctly", () => {
      cy.get('button:has(svg)').should('be.visible').and('have.class', 'h-10', 'w-10');
    });
  });

  context("With Icon", () => {
    it("should render the button with a left icon", () => {
      cy.contains("Icon Left").should("be.visible").find("svg").should("have.class", "mr-2");
    });

    it("should render the button with a right icon", () => {
      cy.contains("Icon Right").should("be.visible").find("svg").should("have.class", "ml-2");
    });
  });

  context("Accessibility", () => {
    it("should have a visible focus ring on tab", () => {
      cy.contains("Primary").focus().should("have.css", "outline");
    });

    it("should be keyboard navigable", () => {
      cy.contains("Primary").focus();
      cy.focused().type("{enter}");
    });
  });
});
