/**
 * Shared Demo Planner Seeding Functions
 *
 * Accepts a Prisma client as a parameter so this module can be used by:
 *   - prisma/seed.ts (runs with PG-adapter client directly)
 *   - src/lib/seed/trial-seed.ts (API route, uses @/lib/db client)
 *   - E2E Playwright setup helpers
 *
 * Note: template propagation intentionally avoids prisma.$transaction to
 * work around a known driver-adapter bug (see WORKAROUND comments in seed.ts).
 */

import {
  Language,
  TaskAssignment,
  PriceType,
  WeddingStatus,
  MemberType,
  TastingMenuStatus,
  LocationType,
  QuoteStatus,
  ContractStatus,
  PrismaClient,
} from '@prisma/client';
import { Prisma } from '@prisma/client';

// ============================================================================
// DATA CONSTANTS
// ============================================================================

export const PROVIDER_CATEGORIES = [
  { name: 'Venue', price_type: PriceType.GLOBAL },
  { name: 'Catering', price_type: PriceType.PER_PERSON },
  { name: 'Photography', price_type: PriceType.GLOBAL },
  { name: 'Music/DJ', price_type: PriceType.GLOBAL },
  { name: 'Flowers', price_type: PriceType.GLOBAL },
];

export const CHECKLIST_TEMPLATE_DATA = [
  {
    name: 'Administración y Finanzas',
    tasks: [
      { title: 'Establecer presupuesto total', description: 'Definir el límite máximo de gasto', assigned_to: TaskAssignment.COUPLE },
      { title: 'Firmar contrato con Wedding Planner', description: 'Formalizar la relación contractual', assigned_to: TaskAssignment.WEDDING_PLANNER },
    ],
  },
  {
    name: 'Proveedores Principales',
    tasks: [
      { title: 'Reserva de Espacio (Venue)', description: 'Confirmar fecha y lugar', assigned_to: TaskAssignment.COUPLE },
      { title: 'Contratar Catering', description: 'Degustación y reserva', assigned_to: TaskAssignment.COUPLE },
    ],
  },
];

export const TIPTAP_CONTRACT_ES = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Contrato de Servicios de Wedding Planner' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Este contrato se celebra entre {{planner.name}} (en adelante, "el Planner") y {{customer.name}} (en adelante, "el Cliente").' }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '1. Objeto del Contrato' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'El Planner se compromete a prestar servicios de planificación, organización y coordinación para la boda del Cliente, que se celebrará en la fecha y lugar acordados.' }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '2. Servicios Incluidos' }] },
    { type: 'bulletList', content: [
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Asesoramiento y consultoría ilimitada.' }] }] },
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Búsqueda y gestión de proveedores.' }] }] },
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Coordinación del día de la boda.' }] }] },
    ]},
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '3. Honorarios y Forma de Pago' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Los honorarios totales por los servicios son de {{quote.total}} EUR. El pago se realizará según el calendario de pagos adjunto.' }] },
  ],
};

export const TIPTAP_CONTRACT_EN = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Wedding Planner Service Agreement' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'This agreement is made between {{planner.name}} (hereinafter, "the Planner") and {{customer.name}} (hereinafter, "the Client").' }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '1. Scope of Agreement' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'The Planner agrees to provide wedding planning, organization, and coordination services for the Client\'s wedding, to be held on the agreed-upon date and location.' }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '2. Included Services' }] },
    { type: 'bulletList', content: [
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Unlimited advice and consultation.' }] }] },
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Vendor sourcing and management.' }] }] },
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Coordination on the wedding day.' }] }] },
    ]},
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '3. Fees and Payment' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'The total fees for the services are {{quote.total}} EUR. Payment shall be made according to the attached payment schedule.' }] },
  ],
};

// ============================================================================
// UTILITIES
// ============================================================================

const SPANISH_FIRST_NAMES = [
  'María', 'José', 'Juan', 'Antonio', 'Francisco', 'Manuel', 'Carlos', 'Ana', 'Carmen', 'Rosa',
  'Javier', 'Elena', 'Laura', 'David', 'Isabel', 'Alejandro', 'Sofía', 'Pablo', 'Lucía', 'Miguel',
  'Sara', 'Daniel', 'Paula', 'Adrián', 'Marta', 'Sergio', 'Cristina', 'Álvaro', 'Raquel', 'Roberto',
  'Patricia', 'Fernando', 'Natalia', 'Andrés', 'Silvia', 'Diego', 'Alicia', 'Ricardo', 'Verónica',
  'Jorge', 'Beatriz', 'Iván', 'Pilar', 'Rubén', 'Nuria', 'Óscar', 'Irene', 'Víctor', 'Amparo',
  'Gonzalo', 'Teresa', 'Enrique', 'Lorena', 'Héctor', 'Mónica', 'Tomás', 'Inés', 'Ignacio', 'Clara',
];
const SPANISH_LAST_NAMES = [
  'García', 'Martínez', 'González', 'Rodríguez', 'Pérez', 'López', 'Sánchez', 'Fernández', 'Gómez', 'Díaz',
  'Jiménez', 'Ruiz', 'Hernández', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Alonso', 'Gutiérrez', 'Navarro',
  'Torres', 'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Serrano', 'Blanco', 'Molina', 'Morales', 'Suárez',
  'Ortega', 'Delgado', 'Castro', 'Ortiz', 'Rubio', 'Marín', 'Sanz', 'Iglesias', 'Nuñez', 'Medina',
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomName() {
  return { first: getRandomElement(SPANISH_FIRST_NAMES), last: getRandomElement(SPANISH_LAST_NAMES) };
}

function generateFamilyGroupName(lastName: string): string {
  const roll = Math.random();
  if (roll < 0.30) {
    // "Familia García"
    return `Familia ${lastName}`;
  } else if (roll < 0.50) {
    // "Amigos de Ana" / "Amigos de Carlos"
    const name = getRandomElement(SPANISH_FIRST_NAMES);
    return `Amigos de ${name}`;
  } else if (roll < 0.65) {
    // "Los García" / "Los Martínez"
    return `Los ${lastName}`;
  } else if (roll < 0.75) {
    // "Ana y Pablo" (couple by first names)
    const n1 = getRandomElement(SPANISH_FIRST_NAMES);
    let n2 = getRandomElement(SPANISH_FIRST_NAMES);
    while (n2 === n1) n2 = getRandomElement(SPANISH_FIRST_NAMES);
    return `${n1} y ${n2}`;
  } else if (roll < 0.82) {
    // "Compañeros de trabajo de María"
    const name = getRandomElement(SPANISH_FIRST_NAMES);
    return `Compañeros de ${name}`;
  } else if (roll < 0.89) {
    // "Ana López" (single named guest)
    const fn = getRandomElement(SPANISH_FIRST_NAMES);
    return `${fn} ${lastName}`;
  } else if (roll < 0.94) {
    // "Primos García"
    return `Primos ${lastName}`;
  } else {
    // "Vecinos de los García"
    return `Vecinos de los ${lastName}`;
  }
}

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

/**
 * Seeds provider categories, checklist template, message templates (from master),
 * and contract templates for a planner.
 *
 * Safe to call on an already-partially-seeded planner — checks for existing data.
 */
export async function seedPlannerDemoBasics(client: PrismaClient, plannerId: string): Promise<void> {
  // 1. Provider categories
  for (const cat of PROVIDER_CATEGORIES) {
    const existing = await client.providerCategory.findFirst({
      where: { planner_id: plannerId, name: cat.name },
    });
    if (!existing) {
      await client.providerCategory.create({
        data: { planner_id: plannerId, name: cat.name, price_type: cat.price_type },
      });
    }
  }

  // 2. Checklist template
  let ct = await client.checklistTemplate.findUnique({ where: { planner_id: plannerId } });
  if (!ct) {
    ct = await client.checklistTemplate.create({ data: { planner_id: plannerId } });
  }

  const sectionCount = await client.checklistSection.count({ where: { template_id: ct.id } });
  if (sectionCount === 0) {
    for (let i = 0; i < CHECKLIST_TEMPLATE_DATA.length; i++) {
      const sData = CHECKLIST_TEMPLATE_DATA[i];
      const section = await client.checklistSection.create({
        data: { template_id: ct.id, name: sData.name, order: i },
      });
      for (let j = 0; j < sData.tasks.length; j++) {
        const tData = sData.tasks[j];
        await client.checklistTask.create({
          data: {
            template_id: ct.id,
            section_id: section.id,
            title: tData.title,
            description: tData.description,
            assigned_to: tData.assigned_to,
            order: j,
          },
        });
      }
    }
  }

  // 3. Planner message templates from master
  // WORKAROUND: avoid prisma.$transaction to work around driver-adapter bug
  const masterTemplates = await client.masterMessageTemplate.findMany();
  const plannerTemplates = await client.plannerMessageTemplate.findMany({
    where: { planner_id: plannerId },
  });
  const existingSet = new Set(plannerTemplates.map(pt => `${pt.type}:${pt.language}:${pt.channel}`));

  for (const mt of masterTemplates) {
    const key = `${mt.type}:${mt.language}:${mt.channel}`;
    if (!existingSet.has(key)) {
      await client.plannerMessageTemplate.create({
        data: {
          planner_id: plannerId,
          type: mt.type,
          language: mt.language,
          channel: mt.channel,
          subject: mt.subject,
          body: mt.body,
        },
      });
    }
  }

  // 4. Contract templates
  const allContractTemplates = await client.contractTemplate.findMany({ where: { planner_id: plannerId } });
  const hasES = allContractTemplates.some(t => t.language === Language.ES);
  const hasEN = allContractTemplates.some(t => t.language === Language.EN);

  if (!hasES) {
    await client.contractTemplate.create({
      data: {
        planner_id: plannerId,
        name: 'Contrato Estándar',
        language: Language.ES,
        content: TIPTAP_CONTRACT_ES as Prisma.InputJsonValue,
        is_default: true,
      },
    });
  }
  if (!hasEN) {
    await client.contractTemplate.create({
      data: {
        planner_id: plannerId,
        name: 'Standard Contract',
        language: Language.EN,
        content: TIPTAP_CONTRACT_EN as Prisma.InputJsonValue,
      },
    });
  }
}

/**
 * Seeds a full demo wedding with guests, itinerary, tasting menu, finances, etc.
 * Assumes seedPlannerDemoBasics has already been called for this planner.
 */
export async function seedPlannerDemoData(client: PrismaClient, plannerId: string): Promise<void> {
  // Customer
  const name = generateRandomName();
  const customer = await client.customer.create({
    data: {
      planner_id: plannerId,
      name: `${name.first} & Partner`,
      couple_names: `${name.first} & Partner`,
      email: `demo-${Date.now()}@example.com`,
    },
  });

  // Wedding
  const weddingDate = new Date();
  weddingDate.setMonth(weddingDate.getMonth() + 9);

  const wedding = await client.wedding.create({
    data: {
      planner_id: plannerId,
      customer_id: customer.id,
      couple_names: 'Ana & Luis',
      wedding_date: weddingDate,
      wedding_time: '18:00',
      rsvp_cutoff_date: new Date(weddingDate.getTime() - 30 * 24 * 60 * 60 * 1000),
      created_by: plannerId,
      short_url_initials: 'AL' + Math.floor(Math.random() * 1000),
      status: WeddingStatus.ACTIVE,
      planned_guests: 150,
    },
  });

  // Wedding Admin (Couple) - for E2E testing and couple access
  const weddingAdminEmail = process.env.WEDDING_ADMIN_EMAIL || 'admin@example.com';
  const existingAdmin = await client.weddingAdmin.findFirst({
    where: { email: weddingAdminEmail, wedding_id: wedding.id }
  });
  if (!existingAdmin) {
    await client.weddingAdmin.create({
      data: {
        email: weddingAdminEmail,
        name: wedding.couple_names,
        auth_provider: 'GOOGLE' as const,
        preferred_language: 'EN' as Language,
        invited_by: plannerId,
        wedding_id: wedding.id,
      },
    });
  }

  // Propagate planner templates -> wedding templates
  const plannerTemplates = await client.plannerMessageTemplate.findMany({ where: { planner_id: plannerId } });
  for (const pt of plannerTemplates) {
    await client.messageTemplate.create({
      data: {
        wedding_id: wedding.id,
        type: pt.type,
        language: pt.language,
        channel: pt.channel,
        subject: pt.subject,
        body: pt.body,
      },
    });
  }

  // Propagate checklist template -> wedding checklist
  const ct = await client.checklistTemplate.findUnique({
    where: { planner_id: plannerId },
    include: { sections: { include: { tasks: true } } },
  });
  if (ct) {
    for (const section of ct.sections) {
      const newSection = await client.checklistSection.create({
        data: { wedding_id: wedding.id, name: section.name, order: section.order },
      });
      for (const task of section.tasks) {
        await client.checklistTask.create({
          data: {
            wedding_id: wedding.id,
            section_id: newSection.id,
            title: task.title,
            description: task.description,
            assigned_to: task.assigned_to,
            order: task.order,
          },
        });
      }
    }
  }

  // Set due date for planner contract task
  const plannerTask = await client.checklistTask.findFirst({
    where: { wedding_id: wedding.id, title: 'Firmar contrato con Wedding Planner' },
  });
  if (plannerTask) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 10);
    await client.checklistTask.update({ where: { id: plannerTask.id }, data: { due_date: dueDate } });
  }

  // Propagate provider categories -> wedding provider slots
  const categories = await client.providerCategory.findMany({ where: { planner_id: plannerId } });
  for (const cat of categories) {
    await client.weddingProvider.create({
      data: { wedding_id: wedding.id, category_id: cat.id, name: `Pendiente: ${cat.name}` },
    });
  }

  // Locations
  const finca = await client.location.create({
    data: {
      planner_id: plannerId,
      name: 'Finca La Marquesa',
      address: 'Carretera M-501, Km 25, 28690 Villaviciosa de Odón, Madrid',
      google_maps_url: 'https://maps.app.goo.gl/abcdef123456',
    },
  });
  const hotel = await client.location.create({
    data: {
      planner_id: plannerId,
      name: 'Hotel Palace, Madrid',
      address: 'Plaza de las Cortes, 7, 28014 Madrid',
      google_maps_url: 'https://maps.app.goo.gl/fedcba654321',
    },
  });

  // Itinerary
  const prebodaDate = new Date(wedding.wedding_date);
  prebodaDate.setDate(prebodaDate.getDate() - 1);
  await client.itineraryItem.create({ data: { wedding_id: wedding.id, location_id: hotel.id, item_type: LocationType.PRE_EVENT, date_time: prebodaDate, notes: 'Cena y copas de bienvenida para la familia y amigos cercanos.', order: 1 } });
  await client.itineraryItem.create({ data: { wedding_id: wedding.id, location_id: finca.id, item_type: LocationType.CEREMONY, date_time: wedding.wedding_date, notes: 'Ceremonia civil en los jardines.', order: 2 } });
  await client.itineraryItem.create({ data: { wedding_id: wedding.id, location_id: finca.id, item_type: LocationType.EVENT, date_time: new Date(wedding.wedding_date.getTime() + 2 * 60 * 60 * 1000), notes: 'Banquete y fiesta en el salón principal.', order: 3 } });

  // Guests (~50 families, ~75 members)
  for (let i = 0; i < 50; i++) {
    const familyName = getRandomElement(SPANISH_LAST_NAMES);
    const member1Name = generateRandomName();
    const family = await client.family.create({
      data: {
        wedding_id: wedding.id,
        name: generateFamilyGroupName(familyName),
        members: { create: [{ name: `${member1Name.first} ${member1Name.last}`, type: MemberType.ADULT }] },
      },
    });
    if (Math.random() > 0.5) {
      const member2Name = generateRandomName();
      await client.familyMember.create({
        data: { family_id: family.id, name: `${member2Name.first} ${member2Name.last}`, type: MemberType.ADULT },
      });
    }
  }

  // Quote + Contract
  const quote = await client.quote.create({
    data: {
      planner_id: plannerId,
      customer_id: customer.id,
      couple_names: customer.couple_names!,
      status: QuoteStatus.ACCEPTED,
      subtotal: new Prisma.Decimal(3000),
      total: new Prisma.Decimal(3630),
      tax_rate: new Prisma.Decimal(21),
      line_items: { create: [{ name: 'Honorarios Planning', quantity: 1, unit_price: 3000, total: 3000 }] },
    },
  });

  const contractTemplates = await client.contractTemplate.findMany({ where: { planner_id: plannerId } });
  const esTemplate = contractTemplates.find(t => t.language === Language.ES);
  await client.contract.create({
    data: {
      planner_id: plannerId,
      customer_id: customer.id,
      quote_id: quote.id,
      title: 'Contrato de Boda',
      content: esTemplate?.content ?? {},
      status: ContractStatus.SIGNED,
      signed_at: new Date(),
      contract_template_id: esTemplate?.id,
    },
  });

  // Provider costs
  const venueProvider = await client.weddingProvider.findFirst({ where: { wedding_id: wedding.id, category: { name: 'Venue' } } });
  if (venueProvider) await client.weddingProvider.update({ where: { id: venueProvider.id }, data: { budgeted_price: new Prisma.Decimal('12000') } });

  const cateringProvider = await client.weddingProvider.findFirst({ where: { wedding_id: wedding.id, category: { name: 'Catering' } } });
  if (cateringProvider) await client.weddingProvider.update({ where: { id: cateringProvider.id }, data: { budgeted_price: new Prisma.Decimal('18000') } });

  // Tasting menu
  const tastingMenu = await client.tastingMenu.create({
    data: { wedding_id: wedding.id, title: 'Prueba de Menú', status: TastingMenuStatus.OPEN, tasting_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) },
  });
  const appetizers = await client.tastingSection.create({ data: { menu_id: tastingMenu.id, name: 'Aperitivos', order: 1 } });
  await client.tastingDish.createMany({ data: [
    { section_id: appetizers.id, name: 'Jamón Ibérico de Bellota', description: 'Cortado a mano', order: 1 },
    { section_id: appetizers.id, name: 'Croquetas de Boletus', description: 'Con alioli de trufa', order: 2 },
    { section_id: appetizers.id, name: 'Vieiras a la plancha', description: 'Sobre puré de coliflor', order: 3 },
  ]});
  const mains = await client.tastingSection.create({ data: { menu_id: tastingMenu.id, name: 'Platos Principales', order: 2 } });
  await client.tastingDish.createMany({ data: [
    { section_id: mains.id, name: 'Solomillo de ternera', description: 'Con salsa de vino tinto y patatas gratinadas', order: 1 },
    { section_id: mains.id, name: 'Lubina salvaje', description: 'Con risotto de verduras de temporada', order: 2 },
  ]});
  const desserts = await client.tastingSection.create({ data: { menu_id: tastingMenu.id, name: 'Postres', order: 3 } });
  await client.tastingDish.createMany({ data: [
    { section_id: desserts.id, name: 'Tarta cremosa de queso', description: 'Con frutos rojos', order: 1 },
    { section_id: desserts.id, name: 'Volcán de chocolate', description: 'Con helado de vainilla', order: 2 },
  ]});
  await client.tastingParticipant.createMany({ data: [
    { menu_id: tastingMenu.id, name: wedding.couple_names.split(' & ')[0] },
    { menu_id: tastingMenu.id, name: wedding.couple_names.split(' & ')[1] },
    { menu_id: tastingMenu.id, name: 'Padre de la Novia' },
  ]});
}
