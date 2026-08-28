/**
 * Core domain types for FusionOS.
 *
 * These are the foundational entity types that will be expanded
 * as each domain module is implemented.
 */

import type { TenantEntity, SoftDeletableEntity, MoneyAmount } from '@fusionos/shared';

// ── Company / Tenant ─────────────────────────────────────────────────────────

export interface Company extends TenantEntity {
  name: string;
  legalName?: string;
  registrationNumber?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  website?: string;
  logo?: string;
  address?: Address;
  settings: CompanySettings;
}

export interface CompanySettings {
  timezone: string;
  currency: string;
  fiscalYearStart: number; // month (1-12)
  dateFormat: string;
}

// ── Organization ─────────────────────────────────────────────────────────────

export interface Branch extends TenantEntity {
  name: string;
  code: string;
  address?: Address;
  isActive: boolean;
}

export interface Department extends TenantEntity {
  name: string;
  code: string;
  branchId?: string;
  parentId?: string;
  headId?: string; // employee ID
  isActive: boolean;
}

export interface Team extends TenantEntity {
  name: string;
  departmentId: string;
  managerId?: string; // employee ID
  isActive: boolean;
}

// ── Common ───────────────────────────────────────────────────────────────────

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
}

// ── Employee (Master Entity) ─────────────────────────────────────────────────

export interface Employee extends SoftDeletableEntity {
  employeeCode: string;
  userId?: string; // linked auth user
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: string;
  maritalStatus?: string;
  address?: Address;
  emergencyContacts?: EmergencyContact[];
  departmentId: string;
  designationId?: string;
  branchId?: string;
  teamId?: string;
  managerId?: string;
  employmentStatus: EmploymentStatus;
  joiningDate: Date;
  probationEndDate?: Date;
  confirmationDate?: Date;
  salaryStructureId?: string;
  bankAccountId?: string;
  taxInformationId?: string;
}

export type EmploymentStatus =
  | 'draft'
  | 'active'
  | 'probation'
  | 'on_leave'
  | 'suspended'
  | 'terminated'
  | 'resigned'
  | 'retired'
  | 'inactive';

export type EmploymentType =
  | 'full_time'
  | 'part_time'
  | 'contract'
  | 'intern'
  | 'temporary';

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}
