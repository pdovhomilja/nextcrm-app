/**
 * CRM fixtures seed.
 *
 * Implements §3.4.2 of "Diseño de Pruebas de Integración" — creates the
 * minimum set of CRM entities that every integration suite can rely on:
 *   - 1 Account (Empresa Demo SAC)
 *   - 1 Contact (Juan Pérez, linked to the account)
 *   - 1 Lead (Carlos Mendoza)
 *   - 1 Opportunity (Venta inicial, linked to the account, in QUALIFICATION)
 *   - 1 Contract (Contrato Demo, linked to the account)
 *   - 1 Activity (Nota de prueba, linked to the account)
 *
 * Guarded by INTEGRATION_FIXTURES env var. Skipped in normal `prisma db
 * seed` (which only needs catalogs + admin). Activated in
 * `pnpm test:integration` via the env file .env.integration, and also
 * invokable on demand with `INTEGRATION_FIXTURES=true pnpm exec prisma db
 * seed`.
 *
 * Idempotency: looks up by deterministic name (suffixed with the admin
 * email) before creating. Re-runs are safe.
 */
import type { PrismaClient } from "@prisma/client";

const SUFFIX_TAG = "[fixtures]";

interface SeededIds {
	accountId: string;
	contactId: string;
	leadId: string;
	opportunityId: string;
	contractId: string;
	activityId: string;
}

export function shouldRunFixtures(): boolean {
	return process.env.INTEGRATION_FIXTURES === "true";
}

export async function seedCrmFixtures(
	prisma: PrismaClient,
	adminEmail: string,
): Promise<SeededIds | null> {
	if (!shouldRunFixtures()) {
		console.log(`${SUFFIX_TAG} skipped (INTEGRATION_FIXTURES != "true")`);
		return null;
	}

	const admin = await prisma.users.findUnique({ where: { email: adminEmail } });
	if (!admin) {
		throw new Error(
			`${SUFFIX_TAG} admin user ${adminEmail} not found — run the base seed first.`,
		);
	}
	const ownerId = admin.id;

	// --- 1) Account ---------------------------------------------------------
	const accountName = "Empresa Demo SAC";
	const account = await prisma.crm_Accounts.upsert({
		where: { id: "00000000-0000-0000-0000-000000000000" },
		update: {},
		create: {
			id: "00000000-0000-0000-0000-000000000000",
			v: 0,
			name: accountName,
			email: "contacto@empresademosac.test",
			office_phone: "+51 1 555 0001",
			website: "https://empresademosac.test",
			billing_city: "Lima",
			billing_country: "Peru",
			shipping_city: "Lima",
			shipping_country: "Peru",
			status: "Active",
			type: "Customer",
			description: "Cuenta base semblada por seed de fixtures de integración",
			assigned_to: ownerId,
			createdBy: ownerId,
			updatedBy: ownerId,
		},
	});

	// --- 2) Contact ---------------------------------------------------------
	const existingContact = await prisma.crm_Contacts.findFirst({
		where: { accountsIDs: account.id, first_name: "Juan", last_name: "Pérez" },
		select: { id: true },
	});
	const contact =
		existingContact ??
		(await prisma.crm_Contacts.create({
			data: {
				v: 0,
				first_name: "Juan",
				last_name: "Pérez",
				email: "juan.perez@empresademosac.test",
				office_phone: "+51 1 555 0002",
				mobile_phone: "+51 999 555 002",
				position: "Gerente Comercial",
				accountsIDs: account.id,
				assigned_to: ownerId,
				createdBy: ownerId,
				updatedBy: ownerId,
				status: true,
			},
		}));

	// --- 3) Lead ------------------------------------------------------------
	const existingLead = await prisma.crm_Leads.findFirst({
		where: { firstName: "Carlos", lastName: "Mendoza" },
		select: { id: true },
	});
	const lead =
		existingLead ??
		(await prisma.crm_Leads.create({
			data: {
				v: 0,
				firstName: "Carlos",
				lastName: "Mendoza",
				email: "carlos.mendoza@prospecto.test",
				phone: "+51 999 555 003",
				company: "Prospecto SRL",
				jobTitle: "Director de TI",
				assigned_to: ownerId,
				createdBy: ownerId,
				updatedBy: ownerId,
			},
		}));

	// --- 4) Opportunity (in QUALIFICATION stage) ----------------------------
	// Pick any seeded sales stage — fall back to null if seed is incomplete
	// (PIOP-004 will skip stage-change assertions in that case).
	const stage = await prisma.crm_Opportunities_Sales_Stages.findFirst({
		select: { id: true },
	});
	const opportunityType = await prisma.crm_Opportunities_Type.findFirst({
		select: { id: true },
	});

	const existingOpp = await prisma.crm_Opportunities.findFirst({
		where: { name: "Venta inicial", account: account.id },
		select: { id: true },
	});
	const opportunity =
		existingOpp ??
		(await prisma.crm_Opportunities.create({
			data: {
				v: 0,
				name: "Venta inicial",
				description: "Oportunidad base para pruebas de integración",
				account: account.id,
				assigned_to: ownerId,
				createdBy: ownerId,
				updatedBy: ownerId,
				sales_stage: stage?.id,
				type: opportunityType?.id,
				budget: 0,
				expected_revenue: 0,
				currency: "USD",
				status: "ACTIVE",
			},
		}));

	// --- 5) Contract --------------------------------------------------------
	const existingContract = await prisma.crm_Contracts.findFirst({
		where: { title: "Contrato Demo", account: account.id },
		select: { id: true },
	});
	const contract =
		existingContract ??
		(await prisma.crm_Contracts.create({
			data: {
				v: 0,
				title: "Contrato Demo",
				description: "Contrato base para pruebas de integración",
				account: account.id,
				assigned_to: ownerId,
				createdBy: ownerId,
				updatedBy: ownerId,
				value: 0,
				currency: "USD",
				startDate: new Date(),
				status: "NOTSTARTED",
			},
		}));

	// --- 6) Activity (linked to the account) --------------------------------
	const existingActivity = await prisma.crm_Activities.findFirst({
		where: { title: "Nota de prueba", createdBy: ownerId },
		select: { id: true, links: { select: { id: true } } },
	});
	let activity = existingActivity;
	if (!activity) {
		const created = await prisma.crm_Activities.create({
			data: {
				type: "note",
				title: "Nota de prueba",
				description: "Actividad base para pruebas de integración",
				date: new Date(),
				status: "scheduled",
				createdBy: ownerId,
				updatedBy: ownerId,
			},
			select: { id: true, links: { select: { id: true } } },
		});
		activity = created;
		// Polymorphic link to the account.
		await prisma.crm_ActivityLinks.create({
			data: {
				activityId: created.id,
				entityType: "account",
				entityId: account.id,
			},
		});
	}

	console.log(`${SUFFIX_TAG} seeded: account=${account.id} contact=${contact.id}`);
	console.log(`${SUFFIX_TAG}          lead=${lead.id} opportunity=${opportunity.id}`);
	console.log(`${SUFFIX_TAG}          contract=${contract.id} activity=${activity.id}`);

	return {
		accountId: account.id,
		contactId: contact.id,
		leadId: lead.id,
		opportunityId: opportunity.id,
		contractId: contract.id,
		activityId: activity.id,
	};
}
