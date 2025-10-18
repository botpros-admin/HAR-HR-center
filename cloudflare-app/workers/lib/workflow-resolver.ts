/**
 * Workflow Resolver - Multi-Signer Template-Level Workflow Resolution
 *
 * This module handles resolving template-level workflow configurations into
 * concrete assignment workflows with specific employees.
 *
 * Signer Types:
 * - assignee: The employee(s) being assigned the document
 * - creating_admin: The admin creating the assignment (from session)
 * - assignees_manager: The employee's manager (looked up from Bitrix24)
 * - specific_person: A specific employee (requires bitrixId in config)
 */

import type { Env, DefaultSignerConfig, TemplateSignerConfig, SignerConfig } from '../types';

/**
 * Result of resolving a template workflow for a single assignment
 */
export interface ResolvedAssignment {
  assigneeId: number;
  signers: ResolvedSigner[];
}

/**
 * A concrete signer with all details resolved
 */
export interface ResolvedSigner {
  order: number;
  bitrixId: number;
  employeeName: string;
  employeeEmail?: string;
  roleName: string;
}

/**
 * Context needed to resolve signer types
 */
export interface WorkflowResolutionContext {
  assigneeIds: number[]; // Employees being assigned the document
  creatingAdminId: number; // Admin creating the assignment
  env: Env; // Cloudflare environment (DB, KV, etc.)
}

/**
 * Main entry point: Resolves a template's workflow configuration into
 * concrete assignments with specific signers.
 *
 * @param workflowConfig - Template's default_signer_config JSON
 * @param context - Resolution context (assignees, admin, env)
 * @returns Array of resolved assignments (one per assignee)
 */
export async function resolveTemplateWorkflow(
  workflowConfig: DefaultSignerConfig | null,
  context: WorkflowResolutionContext
): Promise<ResolvedAssignment[]> {
  // Handle single-signer mode (backward compatibility)
  if (!workflowConfig || workflowConfig.mode === 'single_signer') {
    return context.assigneeIds.map(assigneeId => ({
      assigneeId,
      signers: [], // Single-signer = no explicit signers (assignee signs implicitly)
    }));
  }

  // Multi-signer mode: Resolve workflow for each assignee
  if (!workflowConfig.signers || workflowConfig.signers.length === 0) {
    throw new Error('Multi-signer mode requires at least one signer configuration');
  }

  const resolvedAssignments: ResolvedAssignment[] = [];

  for (const assigneeId of context.assigneeIds) {
    try {
      const signers = await resolveWorkflowForAssignee(
        workflowConfig.signers,
        assigneeId,
        context
      );

      resolvedAssignments.push({
        assigneeId,
        signers,
      });
    } catch (error) {
      console.error(`Failed to resolve workflow for assignee ${assigneeId}:`, error);
      throw new Error(`Cannot resolve workflow for employee ${assigneeId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return resolvedAssignments;
}

/**
 * Resolves a workflow configuration for a single assignee.
 *
 * @param signerConfigs - Template's signer configurations
 * @param assigneeId - The employee being assigned
 * @param context - Resolution context
 * @returns Array of resolved signers with concrete details
 */
async function resolveWorkflowForAssignee(
  signerConfigs: TemplateSignerConfig[],
  assigneeId: number,
  context: WorkflowResolutionContext
): Promise<ResolvedSigner[]> {
  const resolvedSigners: ResolvedSigner[] = [];
  const seenBitrixIds = new Set<number>(); // Prevent duplicate signers

  // Sort by order to maintain sequence
  const sortedConfigs = [...signerConfigs].sort((a, b) => a.order - b.order);

  for (const config of sortedConfigs) {
    try {
      const signer = await resolveSignerType(config, assigneeId, context);

      // Skip if duplicate (e.g., assignee's manager is also the creating admin)
      if (seenBitrixIds.has(signer.bitrixId)) {
        console.warn(`Duplicate signer detected: ${signer.employeeName} (${signer.bitrixId}). Skipping.`);
        continue;
      }

      seenBitrixIds.add(signer.bitrixId);
      resolvedSigners.push(signer);
    } catch (error) {
      console.error(`Failed to resolve signer at order ${config.order}:`, error);
      throw error;
    }
  }

  // Ensure at least one signer after deduplication
  if (resolvedSigners.length === 0) {
    throw new Error('Workflow resolution resulted in zero signers after deduplication');
  }

  // Renumber orders after deduplication (1, 2, 3, ...)
  return resolvedSigners.map((signer, index) => ({
    ...signer,
    order: index + 1,
  }));
}

/**
 * Resolves a single signer configuration into a concrete signer.
 *
 * @param config - Template signer configuration
 * @param assigneeId - The employee being assigned
 * @param context - Resolution context
 * @returns Resolved signer with concrete details
 */
async function resolveSignerType(
  config: TemplateSignerConfig,
  assigneeId: number,
  context: WorkflowResolutionContext
): Promise<ResolvedSigner> {
  const { env, creatingAdminId } = context;

  switch (config.signerType) {
    case 'assignee':
      return await resolveAssigneeSigner(assigneeId, config.roleName, env);

    case 'creating_admin':
      return await resolveCreatingAdminSigner(creatingAdminId, config.roleName, env);

    case 'assignees_manager':
      return await resolveManagerSigner(assigneeId, config.roleName, env);

    case 'specific_person':
      if (!config.bitrixId) {
        throw new Error('specific_person signer type requires bitrixId in configuration');
      }
      return await resolveSpecificPersonSigner(config.bitrixId, config.roleName, env);

    default:
      throw new Error(`Unknown signer type: ${config.signerType}`);
  }
}

/**
 * Resolves an 'assignee' signer type.
 * The employee being assigned the document.
 */
async function resolveAssigneeSigner(
  bitrixId: number,
  roleName: string,
  env: Env
): Promise<ResolvedSigner> {
  const employee = await fetchEmployeeDetails(bitrixId, env);
  return {
    order: 0, // Will be renumbered later
    bitrixId: employee.bitrixId,
    employeeName: employee.name,
    employeeEmail: employee.email,
    roleName,
  };
}

/**
 * Resolves a 'creating_admin' signer type.
 * The admin who is creating the assignment.
 */
async function resolveCreatingAdminSigner(
  bitrixId: number,
  roleName: string,
  env: Env
): Promise<ResolvedSigner> {
  const admin = await fetchEmployeeDetails(bitrixId, env);
  return {
    order: 0, // Will be renumbered later
    bitrixId: admin.bitrixId,
    employeeName: admin.name,
    employeeEmail: admin.email,
    roleName,
  };
}

/**
 * Resolves an 'assignees_manager' signer type.
 * Looks up the employee's manager from Bitrix24.
 */
async function resolveManagerSigner(
  assigneeId: number,
  roleName: string,
  env: Env
): Promise<ResolvedSigner> {
  // Fetch employee to get their manager's Bitrix ID
  const employee = await fetchEmployeeDetails(assigneeId, env);

  // Look up manager ID from employee record
  // Note: This assumes Bitrix24 has a manager field (e.g., assignedById or custom field)
  // You may need to adjust this based on your Bitrix24 setup
  const managerBitrixId = employee.managerId;

  if (!managerBitrixId) {
    throw new Error(`Employee ${employee.name} (${assigneeId}) has no manager assigned in Bitrix24`);
  }

  const manager = await fetchEmployeeDetails(managerBitrixId, env);
  return {
    order: 0, // Will be renumbered later
    bitrixId: manager.bitrixId,
    employeeName: manager.name,
    employeeEmail: manager.email,
    roleName,
  };
}

/**
 * Resolves a 'specific_person' signer type.
 * A specific employee identified by Bitrix ID in the template config.
 */
async function resolveSpecificPersonSigner(
  bitrixId: number,
  roleName: string,
  env: Env
): Promise<ResolvedSigner> {
  const person = await fetchEmployeeDetails(bitrixId, env);
  return {
    order: 0, // Will be renumbered later
    bitrixId: person.bitrixId,
    employeeName: person.name,
    employeeEmail: person.email,
    roleName,
  };
}

/**
 * Fetches employee details from the database cache.
 *
 * @param bitrixId - Employee's Bitrix ID
 * @param env - Cloudflare environment
 * @returns Employee details
 */
async function fetchEmployeeDetails(
  bitrixId: number,
  env: Env
): Promise<{ bitrixId: number; name: string; email?: string; managerId?: number }> {
  // Query employee_cache table
  const result = await env.DB.prepare(`
    SELECT bitrix_id, full_name, email, data
    FROM employee_cache
    WHERE bitrix_id = ?
    LIMIT 1
  `).bind(bitrixId).first();

  if (!result) {
    throw new Error(`Employee with Bitrix ID ${bitrixId} not found in cache`);
  }

  // Parse data JSON to get manager ID (if exists)
  let managerId: number | undefined;
  try {
    const data = JSON.parse(result.data as string);
    // Bitrix24 typically uses 'assignedById' for manager/supervisor
    managerId = data.assignedById ? parseInt(data.assignedById) : undefined;
  } catch (error) {
    console.warn(`Failed to parse employee data for ${bitrixId}:`, error);
  }

  return {
    bitrixId: result.bitrix_id as number,
    name: result.full_name as string,
    email: result.email as string | undefined,
    managerId,
  };
}

/**
 * Helper: Convert resolved assignments into database-ready records.
 * This is used when creating document_assignments and document_signers.
 */
export function convertToSignerRecords(resolved: ResolvedAssignment): SignerConfig[] {
  return resolved.signers.map(signer => ({
    order: signer.order,
    bitrixId: signer.bitrixId,
    employeeName: signer.employeeName,
    employeeEmail: signer.employeeEmail,
    roleName: signer.roleName,
  }));
}
