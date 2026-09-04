/**
 * FusionOS Projects Module
 * Project Management — extends existing Employee, Customer, Company entities.
 */

import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './services/projects.service';

@Module({
  controllers: [ProjectsController],
  providers: [
    PrismaClient,
    ProjectsService,
  ],
  exports: [ProjectsService],
})
export class ProjectsModule {}
