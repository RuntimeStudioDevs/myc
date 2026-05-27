import Link from "next/link";
import { requireAnyRole } from "@/lib/auth/guards";
import { getAssignmentFilter } from "@/lib/projects/permissions";
import { listProjects, listActiveClients, listActiveEngineers } from "@/lib/projects/queries";
import {
  createProjectAction,
  updateProjectAction,
  archiveProjectAction,
} from "@/lib/projects/actions";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    created?: string;
    updated?: string;
    archived?: string;
  }>;
}) {
  // Validar acceso basico por rol
  await requireAnyRole([
    "super_admin",
    "ingeniero",
    "marketing",
  ]);

  // Obtener filtro de asignacion: super_admin ve todo,
  // ingeniero y marketing solo obras asignadas
  const { profile, userId } = await getAssignmentFilter();

  const canWrite =
    profile.role === "super_admin" || profile.role === "ingeniero";

  const projects = await listProjects(userId);
  const params = await searchParams;

  // Solo cargar datos de formulario si tiene permiso de escritura
  const clients = canWrite ? await listActiveClients() : [];
  const engineers = canWrite ? await listActiveEngineers() : [];

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Obras</h1>
            <p className="text-sm text-neutral-500">
              {canWrite
                ? "Gestion de obras"
                : "Visualizacion de obras"}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-neutral-500 underline hover:text-neutral-900"
          >
            Volver al dashboard
          </Link>
        </div>

        {params.error && (
          <p className="rounded bg-red-50 p-3 text-sm text-red-800">
            {decodeURIComponent(params.error)}
          </p>
        )}
        {params.created === "true" && (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">
            Obra creada.
          </p>
        )}
        {params.updated === "true" && (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">
            Obra actualizada.
          </p>
        )}
        {params.archived === "true" && (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">
            Obra archivada.
          </p>
        )}

        {/* Formulario de creacion (solo escritura) */}
        {canWrite && (
          <section className="rounded border border-neutral-200 p-4 space-y-4">
            <h2 className="font-medium">Crear obra</h2>
            <form
              action={createProjectAction}
              className="grid grid-cols-2 gap-3"
            >
              <input
                name="name"
                type="text"
                placeholder="Nombre de la obra"
                required
                className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
              />
              <select
                name="clientId"
                required
                defaultValue=""
                className="rounded border border-neutral-300 px-3 py-1.5 text-sm bg-white"
              >
                <option value="" disabled>
                  Seleccionar cliente
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName} ({c.user.email})
                  </option>
                ))}
              </select>
              <select
                name="engineerId"
                required
                defaultValue=""
                className="rounded border border-neutral-300 px-3 py-1.5 text-sm bg-white"
              >
                <option value="" disabled>
                  Ingeniero principal
                </option>
                {engineers.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.email})
                  </option>
                ))}
              </select>
              <input
                name="description"
                type="text"
                placeholder="Descripcion (opcional)"
                className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
              />
              <input
                name="startDate"
                type="date"
                className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
              />
              <input
                name="estimatedEndDate"
                type="date"
                className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
              />
              <button
                type="submit"
                className="col-span-2 rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Crear obra
              </button>
            </form>
          </section>
        )}

        {/* Tabla de obras */}
        <section className="space-y-2">
          <h2 className="font-medium">
            Lista de obras ({projects.length})
          </h2>
          {projects.length === 0 ? (
            <p className="text-sm text-neutral-400">
              No hay obras registradas.
            </p>
          ) : (
            <div className="overflow-x-auto rounded border border-neutral-200">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Nombre</th>
                    <th className="px-3 py-2 font-medium">Cliente</th>
                    <th className="px-3 py-2 font-medium">
                      Ing. Principal
                    </th>
                    <th className="px-3 py-2 font-medium">Estado</th>
                    <th className="px-3 py-2 font-medium">Progreso</th>
                    <th className="px-3 py-2 font-medium">Creado por</th>
                    <th className="px-3 py-2 font-medium" />
                    {canWrite && (
                      <th className="px-3 py-2 font-medium">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {projects.map((project) => {
                    const primaryEngineer = project.assignments[0];
                    return (
                      <tr key={project.id}>
                        <td className="px-3 py-2">{project.name}</td>
                        <td className="px-3 py-2 text-neutral-500">
                          {project.client.displayName}
                        </td>
                        <td className="px-3 py-2 text-neutral-500">
                          {primaryEngineer?.user.name ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded px-2 py-0.5 text-xs ${
                              project.currentStatus === "completado"
                                ? "bg-green-100 text-green-800"
                                : project.currentStatus === "cancelado"
                                  ? "bg-red-100 text-red-800"
                                  : project.currentStatus === "en_progreso"
                                    ? "bg-blue-100 text-blue-800"
                                    : project.currentStatus === "en_pausa"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-neutral-100 text-neutral-700"
                            }`}
                          >
                            {project.currentStatus}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-neutral-200">
                              <div
                                className="h-full rounded-full bg-neutral-700"
                                style={{
                                  width: `${project.currentProgress}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-neutral-500">
                              {project.currentProgress}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-neutral-500 text-xs">
                          {project.creator.name}
                        </td>
                        <td className="px-3 py-2">
                          <Link
                            href={`/dashboard/projects/${project.id}`}
                            className="text-xs text-neutral-500 underline hover:text-neutral-900"
                          >
                            Ver detalle
                          </Link>
                        </td>
                        {canWrite && (
                          <td className="px-3 py-2">
                            <div className="flex gap-2 flex-wrap">
                              {/* Edicion inline */}
                              <form
                                action={updateProjectAction}
                                className="flex items-center gap-1"
                              >
                                <input
                                  type="hidden"
                                  name="projectId"
                                  value={project.id}
                                />
                                <input
                                  type="hidden"
                                  name="description"
                                  value={project.description ?? ""}
                                />
                                <input
                                  name="name"
                                  defaultValue={project.name}
                                  className="w-20 rounded border border-neutral-300 px-1 py-0.5 text-xs"
                                />
                                <select
                                  name="status"
                                  defaultValue={project.currentStatus}
                                  className="rounded border border-neutral-300 px-1 py-0.5 text-xs bg-white"
                                >
                                  <option value="planeacion">
                                    Planeacion
                                  </option>
                                  <option value="en_progreso">
                                    En progreso
                                  </option>
                                  <option value="en_pausa">
                                    En pausa
                                  </option>
                                  <option value="completado">
                                    Completado
                                  </option>
                                  <option value="cancelado">
                                    Cancelado
                                  </option>
                                </select>
                                <input
                                  name="progress"
                                  type="number"
                                  min="0"
                                  max="100"
                                  defaultValue={project.currentProgress}
                                  className="w-12 rounded border border-neutral-300 px-1 py-0.5 text-xs"
                                />
                                <button
                                  type="submit"
                                  className="rounded bg-neutral-100 px-2 py-0.5 text-xs hover:bg-neutral-200"
                                >
                                  Guardar
                                </button>
                              </form>
                              {/* Archivar */}
                              <form action={archiveProjectAction}>
                                <input
                                  type="hidden"
                                  name="projectId"
                                  value={project.id}
                                />
                                <button
                                  type="submit"
                                  className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-700 hover:bg-red-100"
                                >
                                  Archivar
                                </button>
                              </form>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
