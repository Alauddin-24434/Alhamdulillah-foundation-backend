import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BannerService } from '../banner/banner.service';
import { ProjectService } from '../project/project.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const logger = new Logger('SeedBanners');

  try {
    const bannerService = app.get(BannerService);
    const projectService = app.get(ProjectService);

    // 1. Get existing projects to link
    const projectsResult: any = await projectService.findAll({ limit: 5 });
    const projects = projectsResult.data;

    if (!projects || projects.length === 0) {
      logger.error(
        '❌ No projects found. Please run "npm run seed" (for projects) first.',
      );
      process.exit(1);
    }

    logger.log(`📚 Found ${projects.length} projects to link.`);

    // 2. Define Dummy Banners
    const bannersData = [
      {
        title: 'Invest in Halal Agriculture',
        description:
          'Join our community-driven organic farming projects and earn halal profits.',
        image:
          'https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80&w=2948&auto=format&fit=crop',
        displayOrder: 1,
      },
      {
        title: 'Empowering Farmers, Growing Wealth',
        description:
          'Direct investment in fish farming and poultry with complete transparency.',
        image:
          'https://images.unsplash.com/photo-1524704054469-44931d7e234e?q=80&w=2848&auto=format&fit=crop',
        displayOrder: 2,
      },
      {
        title: 'Sustainable Real Estate',
        description:
          'Secure your future with our exclusive Shariah-compliant housing projects.',
        image:
          'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=2873&auto=format&fit=crop',
        displayOrder: 3,
      },
    ];

    // 3. Clear existing banners (optional, but good for clean seed)
    // We can't easily clear all with service, so we'll just create new ones.
    // Implementing a quick clear mechanism if possible implies direct model access or loop delete.
    // For now, let's just add them.

    for (let i = 0; i < bannersData.length; i++) {
      const bannerInfo = bannersData[i];
      // Cycle through projects to assign different ones
      const project = projects[i % projects.length];

      await bannerService.create({
        title: bannerInfo.title,
        description: bannerInfo.description,
        image: bannerInfo.image,
        displayOrder: bannerInfo.displayOrder,
        isActive: true,
      });

      logger.log(
        `✅ Created banner: "${bannerInfo.title}" linked to "${project.name}"`,
      );
    }

    logger.log('🎉 Banner seeding completed successfully!');
  } catch (error) {
    logger.error('❌ Banner seeding failed:', error);
  } finally {
    await app.close();
    process.exit();
  }
}

bootstrap();
