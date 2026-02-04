import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ProjectService } from '../project/project.service';
import { ProjectStatus } from '../project/schemas/project.schema';
import { Logger } from '@nestjs/common';
import { Types } from 'mongoose';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const logger = new Logger('SeedProjects');

  try {
    const projectService = app.get(ProjectService);

    // ✅ Fixed Admin ID
    const creatorId = new Types.ObjectId('6978beb29debc5d92807af02');

    const projects = [
      {
        name: 'Biofloc Fish Farming',
        category: 'Fish Farming',
        status: ProjectStatus.ONGOING,
        initialInvestment: 300000,
        description:
          'High-density fish farming using Biofloc technology in Mymensingh.',
        location: 'Mymensingh, Bangladesh',
        startDate: new Date('2024-02-15'),
        endDate: new Date('2024-08-15'),
        thumbnail:
          'https://images.unsplash.com/photo-1524704054469-44931d7e234e',
        images: [
          'https://images.unsplash.com/photo-1524704054469-44931d7e234e',
        ],
        contactNumber: '+8801711223345',
      },
      {
        name: 'Halal Real Estate Tower',
        category: 'Real Estate',
        status: ProjectStatus.UPCOMING,
        initialInvestment: 5000000,
        description: '10-story residential building in OTTARA, Dhaka.',
        location: 'Uttara, Dhaka',
        startDate: new Date('2024-05-01'),
        endDate: new Date('2026-05-01'),
        thumbnail: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa',
        images: ['https://images.unsplash.com/photo-1560518883-ce09059eeffa'],
        contactNumber: '+8801711223346',
      },
      {
        name: 'Mango Orchard Expansion',
        category: 'Agriculture',
        status: ProjectStatus.EXPIRED,
        initialInvestment: 200000,
        description: 'Expansion of existing mango orchard in Rajshahi.',
        location: 'Rajshahi, Bangladesh',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
        thumbnail:
          'https://images.unsplash.com/photo-1596463990833-289b43936630',
        images: [
          'https://images.unsplash.com/photo-1596463990833-289b43936630',
        ],
        contactNumber: '+8801711223347',
      },
      {
        name: 'Poultry Farm Modernization',
        category: 'Agriculture',
        status: ProjectStatus.ONGOING,
        initialInvestment: 150000,
        description: 'Upgrading equipment for a poultry farm in Gazipur.',
        location: 'Gazipur, Bangladesh',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-09-01'),
        thumbnail:
          'https://images.unsplash.com/photo-1541625602330-2277a4c46182',
        images: [
          'https://images.unsplash.com/photo-1541625602330-2277a4c46182',
        ],
        contactNumber: '+8801711223348',
      },
      {
        name: 'Dairy Farm Project',
        category: 'Agriculture',
        status: ProjectStatus.UPCOMING,
        initialInvestment: 800000,
        description: 'Modern dairy farm project in Pabna.',
        location: 'Pabna, Bangladesh',
        startDate: new Date('2024-06-01'),
        endDate: new Date('2025-06-01'),
        thumbnail:
          'https://images.unsplash.com/photo-1500595046743-cd271d694d30',
        images: [
          'https://images.unsplash.com/photo-1500595046743-cd271d694d30',
        ],
        contactNumber: '+8801711223349',
      },
    ];

    logger.log(`🏗️ Seeding ${projects.length} projects...`);

    for (const project of projects) {
      const created = await projectService.create(
        {
          ...project,
          images: project.images ?? [],
          videos: [],
          members: [],
          totalInvestment: 0,
        } as any,
        creatorId.toString(),
      );

      logger.log(`✅ Created project: ${created.name}`);
    }

    logger.log('🎉 Project seeding completed successfully!');
  } catch (error) {
    logger.error('❌ Seeding failed', error);
  } finally {
    await app.close();
    process.exit();
  }
}

bootstrap();
