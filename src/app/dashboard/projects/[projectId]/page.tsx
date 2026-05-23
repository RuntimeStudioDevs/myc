import Link from "next/link";
import { getAssignmentFilter, hasActiveProjectAssignment } from "@/lib/projects/permissions";
import { getProjectById } from "@/lib/projects/queries";
import {
  listProjectAssignments,
  listAssignableUsers,
  isPrimaryEngineer,
} from "@/lib/projects/assignments/queries";
import {
  assignUserToProjectAction,
  unassignUserFromProjectAction,
  setPrimaryEngineerAction,
} from "@/lib/projects/assignments/actions";
import {
  listProjectUpdates,
  canCreateProjectUpdate,
  canEditProjectUpdate,
  canDeleteProjectUpdate,
} from "@/lib/projects/updates/queries";
import {
  createProjectUpdateAction,
  updateProjectUpdateAction,
  deleteProjectUpdateAction,
} from "@/lib/projects/updates/actions";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    error?: string;
    assigned?: string;
    unassigned?: string;
    "primary-changed"?: string;
    "update-created"?: string;
    "update-edited"?: string;
    "update-deleted"?: string;
  }>;
}) {
  const { projectId } = await params;
  const sp = await searchParams;

  const { profile } = await getAssignmentFilter();

  const canView =
    profile.role === "super_admin" ||
    (await hasActiveProjectAssignment(profile.id, projectId));

  if (!canView) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p className="text-neutral-500">No tienes acceso a esta obra.</p>
      </main>
    );
  }

  const project = await getProjectById(projectId);
  if (!project || project.deletedAt) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p className="text-neutral-500">Obra no encontrada.</p>
      </main>
    );
  }

  const assignments = await listProjectAssignments(projectId);
  const isSuperAdmin = profile.role === "super_admin";
  const isPrincipal =
    profile.role === "ingeniero" &&
    (await isPrimaryEngineer(projectId, profile.id));

  // Permisos de asignacion
  const canAssignEngineers = isSuperAdmin;
  const canAssignMarketing = isSuperAdmin || isPrincipal;
  const canUnassignEngineers = isSuperAdmin;
  const canUnassignMarketing = isSuperAdmin || isPrincipal;
  const canChangePrimary = isSuperAdmin;

  const availableEngineers = canAssignEngineers
    ? await listAssignableUsers(projectId, "ingeniero")
    : [];
  const availableMarketing = canAssignMarketing
    ? await listAssignableUsers(projectId, "marketing")
    : [];

  // Actualizaciones
  const updates = await listProjectUpdates(projectId);
  const canCreateUpdate = await canCreateProjectUpdate(profile, projectId);

  // Resolver permisos de edicion/eliminacion para cada update
  const updatesWithPermissions = await Promise.all(
    updates.map(async (update) => ({
      update,
      canEdit: await canEditProjectUpdate(profile, update.id),
      canDelete: await canDeleteProjectUpdate(profile, update.id),
    })),
  );

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-3xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-sm text-neutral-500">
              {project.client.displayName} ·{" "}
              <span
                className={`rounded px-2 py-0.5 text-xs ${
                  project.currentStatus === "completado"
                    ? "bg-green-100 text-green-800"
                    : project.currentStatus === "cancelado"
                      ? "bg-red-100 text-red-800"
                      : project.currentStatus === "en_progreso"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-neutral-100 text-neutral-700"
                }`}
              >
                {project.currentStatus}
              </span>{" "}
              · {project.currentProgress}%
            </p>
          </div>
          <Link
            href="/dashboard/projects"
            className="text-sm text-neutral-500 underline hover:text-neutral-900"
          >
            Volver a obras
          </Link>
        </div>

        {sp.error && (
          <p className="rounded bg-red-50 p-3 text-sm text-red-800">
            {decodeURIComponent(sp.error)}
          </p>
        )}
        {sp.assigned === "true" && (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">
            Usuario asignado.
          </p>
        )}
        {sp.unassigned === "true" && (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">
            Usuario desasignado.
          </p>
        )}
        {sp["primary-changed"] === "true" && (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">
            Ingeniero principal actualizado.
          </p>
        )}
        {sp["update-created"] === "true" && (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">
            Actualizacion publicada.
          </p>
        )}
        {sp["update-edited"] === "true" && (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">
            Actualizacion editada.
          </p>
        )}
        {sp["update-deleted"] === "true" && (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">
            Actualizacion eliminada.
          </p>
        )}

        {project.description && (
          <p className="text-sm text-neutral-600">{project.description}</p>
        )}

        {/* Asignaciones */}
        <section className="space-y-4">
          <h2 className="font-medium">Asignaciones</h2>
          {assignments.length === 0 ? (
            <p className="text-sm text-neutral-400">
              Sin asignaciones activas.
            </p>
          ) : (
            <div className="rounded border border-neutral-200">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Usuario</th>
                    <th className="px-3 py-2 font-medium">Rol</th>
                    <th className="px-3 py-2 font-medium">Principal</th>
                    <th className="px-3 py-2 font-medium">Asignado</th>
                    {(canUnassignEngineers || canUnassignMarketing) && (
                      <th className="px-3 py-2 font-medium">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {assignments.map((a) => (
                    <tr key={a.id}>
                      <td className="px-3 py-2">
                        {a.user.name}
                        <span className="ml-1 text-xs text-neutral-400">
                          ({a.user.email})
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs">
                          {a.role}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {a.isPrincipal ? (
                          <span className="text-green-700 text-xs font-medium">
                            Principal
                          </span>
                        ) : (
                          <span className="text-neutral-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-neutral-400">
                        {new Date(a.assignedAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          {canChangePrimary &&
                            a.role === "ingeniero" &&
                            !a.isPrincipal && (
                              <form action={setPrimaryEngineerAction}>
                                <input
                                  type="hidden" name="projectId" value={projectId}
                                />
                                <input
                                  type="hidden" name="assignmentId" value={a.id}
                                />
                                <button
                                  type="submit"
                                  className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-100"
                                >
                                  Hacer principal
                                </button>
                              </form>
                            )}
                          {((canUnassignEngineers && a.role === "ingeniero") ||
                            (canUnassignMarketing && a.role === "marketing")) && (
                            <form action={unassignUserFromProjectAction}>
                              <input
                                type="hidden" name="projectId" value={projectId}
                              />
                              <input
                                type="hidden" name="assignmentId" value={a.id}
                              />
                              <button
                                type="submit"
                                className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-700 hover:bg-red-100"
                              >
                                Desasignar
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Formularios de asignacion */}
        {(canAssignEngineers || canAssignMarketing) && (
          <section className="space-y-4 rounded border border-neutral-200 p-4">
            <h2 className="font-medium">Asignar usuario</h2>
            {canAssignEngineers && availableEngineers.length > 0 && (
              <form action={assignUserToProjectAction} className="flex items-end gap-2">
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="assignmentRole" value="ingeniero" />
                <select name="userId" required defaultValue="" className="rounded border border-neutral-300 px-3 py-1.5 text-sm bg-white">
                  <option value="" disabled>Asignar ingeniero</option>
                  {availableEngineers.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.email})</option>
                  ))}
                </select>
                <button type="submit" className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
                  Asignar
                </button>
              </form>
            )}
            {canAssignMarketing && availableMarketing.length > 0 && (
              <form action={assignUserToProjectAction} className="flex items-end gap-2">
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="assignmentRole" value="marketing" />
                <select name="userId" required defaultValue="" className="rounded border border-neutral-300 px-3 py-1.5 text-sm bg-white">
                  <option value="" disabled>Asignar marketing</option>
                  {availableMarketing.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                  ))}
                </select>
                <button type="submit" className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
                  Asignar
                </button>
              </form>
            )}
            {availableEngineers.length === 0 && availableMarketing.length === 0 && (
              <p className="text-sm text-neutral-400">No hay usuarios disponibles para asignar.</p>
            )}
          </section>
        )}

        {/* Formulario de actualizacion */}
        {canCreateUpdate && (
          <section className="space-y-4 rounded border border-neutral-200 p-4">
            <h2 className="font-medium">Publicar actualizacion</h2>
            <form action={createProjectUpdateAction} className="space-y-3">
              <input type="hidden" name="projectId" value={projectId} />
              <input
                name="title"
                type="text"
                placeholder="Titulo de la actualizacion"
                required
                className="w-full rounded border border-neutral-300 px-3 py-1.5 text-sm"
              />
              <textarea
                name="description"
                placeholder="Descripcion (opcional)"
                rows={3}
                className="w-full rounded border border-neutral-300 px-3 py-1.5 text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  name="resultingStatus"
                  defaultValue=""
                  className="rounded border border-neutral-300 px-3 py-1.5 text-sm bg-white"
                >
                  <option value="">Estado (sin cambio)</option>
                  <option value="planeacion">Planeacion</option>
                  <option value="en_progreso">En progreso</option>
                  <option value="en_pausa">En pausa</option>
                  <option value="completado">Completado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
                <input
                  name="resultingProgress"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Progreso (0-100)"
                  className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
                />
              </div>
              <button
                type="submit"
                className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Publicar actualizacion
              </button>
            </form>
          </section>
        )}

        {/* Lista de actualizaciones */}
        <section className="space-y-4">
          <h2 className="font-medium">Actualizaciones ({updates.length})</h2>
          {updates.length === 0 ? (
            <p className="text-sm text-neutral-400">
              Sin actualizaciones publicadas.
            </p>
          ) : (
            <div className="space-y-3">
              {updatesWithPermissions.map(({ update: update, canEdit, canDelete }) => (
                  <div
                    key={update.id}
                    className="rounded border border-neutral-200 p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-sm">
                          {update.title}
                        </h3>
                        <p className="text-xs text-neutral-400">
                          {update.author.name} ·{" "}
                          {new Date(update.createdAt).toLocaleDateString()}
                          {update.editedAt && " (editado)"}
                        </p>
                      </div>
                      {(canEdit || canDelete) && (
                        <div className="flex gap-1">
                          {canDelete && (
                            <form action={deleteProjectUpdateAction}>
                              <input type="hidden" name="updateId" value={update.id} />
                              <button
                                type="submit"
                                className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-700 hover:bg-red-100"
                              >
                                Eliminar
                              </button>
                            </form>
                          )}
                        </div>
                      )}
                    </div>
                    {update.description && (
                      <p className="text-sm text-neutral-600">
                        {update.description}
                      </p>
                    )}
                    {(update.resultingStatus || update.resultingProgress !== null) && (
                      <div className="flex gap-2 text-xs">
                        {update.resultingStatus && (
                          <span className="rounded bg-neutral-100 px-2 py-0.5">
                            Estado: {update.resultingStatus}
                          </span>
                        )}
                        {update.resultingProgress !== null && (
                          <span className="rounded bg-neutral-100 px-2 py-0.5">
                            Progreso: {update.resultingProgress}%
                          </span>
                        )}
                      </div>
                    )}
                    {update.files.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {update.files.map((f) => (
                          <span
                            key={f.id}
                            className="rounded bg-neutral-100 px-2 py-0.5 text-xs"
                          >
                            {f.fileType === "foto" ? "📷" : "🎬"} {f.fileName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
