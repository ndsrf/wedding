import { prisma } from '../src/lib/db/prisma';

async function main() {
  const templates = await prisma.messageTemplate.findMany({
    select: {
      id: true,
      type: true,
      language: true,
      channel: true,
      image_url: true,
      subject: true,
    },
    orderBy: [
      { type: 'asc' },
      { language: 'asc' },
      { channel: 'asc' },
    ],
  });

  console.log('\n=== MESSAGE TEMPLATES ===\n');

  if (templates.length === 0) {
    console.log('No templates found in database.');
  } else {
    templates.forEach((template) => {
      console.log(`Type: ${template.type}`);
      console.log(`Language: ${template.language}`);
      console.log(`Channel: ${template.channel}`);
      console.log(`Subject: ${template.subject.substring(0, 50)}...`);
      console.log(`Image URL: ${template.image_url || 'NO IMAGE'}`);
      console.log('---');
    });
  }

  console.log(`\nTotal templates: ${templates.length}`);
  console.log(`Templates with images: ${templates.filter(t => t.image_url).length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
