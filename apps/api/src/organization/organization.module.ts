/**
 * FusionOS Organization Module
 *
 * Provides Company, Branch, Department, Team, and Designation management.
 * All operations are tenant-scoped.
 */

import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { OrganizationController } from './organization.controller';
import { CompanyService } from './services/company.service';
import { BranchService } from './services/branch.service';
import { DepartmentService } from './services/department.service';
import { TeamService } from './services/team.service';
import { DesignationService } from './services/designation.service';

@Module({
  controllers: [OrganizationController],
  providers: [
    PrismaClient,
    CompanyService,
    BranchService,
    DepartmentService,
    TeamService,
    DesignationService,
  ],
  exports: [
    CompanyService,
    BranchService,
    DepartmentService,
    TeamService,
    DesignationService,
  ],
})
export class OrganizationModule {}
