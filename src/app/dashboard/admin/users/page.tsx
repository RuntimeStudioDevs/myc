import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { listAllUsers } from "@/lib/admin/users/queries";
import {
  createInternalUserAction,
  updateInternalUserAction,
  deactivateInternalUserAction,
} from "@/lib/admin/users/actions";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    created?: string;
    updated?: string;
    deactivated?: string;
  }>;
}) {
  await requireSuperAdmin();
  const users = await listAllUsers();
  const params = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-2xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Usuarios</h1>
            <p className="text-sm text-neutral-500">
              Administracion de usuarios internos
            </p>
          </div>
          <Link
            href="/dashboard/admin"
            className="text-sm text-neutral-500 underline hover:text-neutral-900"
          >
            Volver al admin
          </Link>
        </div>

        {params.error && (
          <p className="rounded bg-red-50 p-3 text-sm text-red-800">
            {decodeURIComponent(params.error)}
          </p>
        )}
        {params.created === "true" && (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">
            Usuario interno creado.
          </p>
        )}
        {params.updated === "true" && (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">
            Usuario actualizado.
          </p>
        )}
        {params.deactivated === "true" && (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">
            Usuario desactivado.
          </p>
        )}

        {/* Formulario de creacion */}
        <section className="rounded border border-neutral-200 p-4 space-y-4">
          <h2 className="font-medium">Crear usuario interno</h2>
          <form
            action={createInternalUserAction}
            className="grid grid-cols-2 gap-3"
          >
            <input
              name="name"
              type="text"
              placeholder="Nombre"
              required
              className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
            />
            <input
              name="password"
              type="password"
              placeholder="Contrasena"
              required
              className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
            />
            <select
              name="role"
              required
              defaultValue=""
              className="rounded border border-neutral-300 px-3 py-1.5 text-sm bg-white"
            >
              <option value="" disabled>
                Seleccionar rol
              </option>
              <option value="ingeniero">Ingeniero</option>
              <option value="marketing">Marketing</option>
            </select>
            <SubmitButton
              type="submit"
              pendingText="Creando..."
              className="col-span-2 rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Crear usuario
            </SubmitButton>
          </form>
        </section>

        {/* Tabla de usuarios */}
        <section className="space-y-2">
          <h2 className="font-medium">
            Lista de usuarios ({users.length})
          </h2>
          {users.length === 0 ? (
            <p className="text-sm text-neutral-400">
              No hay usuarios registrados.
            </p>
          ) : (
            <div className="overflow-x-auto rounded border border-neutral-200">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Nombre</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Rol</th>
                    <th className="px-3 py-2 font-medium">Activo</th>
                    <th className="px-3 py-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-3 py-2">{user.name}</td>
                      <td className="px-3 py-2 text-neutral-500">
                        {user.email}
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {user.active ? (
                          <span className="text-green-700">Si</span>
                        ) : (
                          <span className="text-red-600">No</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {user.role === "ingeniero" ||
                        user.role === "marketing" ? (
                          <div className="flex gap-2">
                            {/* Edicion inline */}
                            <form
                              action={updateInternalUserAction}
                              className="flex items-center gap-1"
                            >
                              <input
                                type="hidden"
                                name="userId"
                                value={user.id}
                              />
                              <input
                                name="name"
                                defaultValue={user.name}
                                className="w-24 rounded border border-neutral-300 px-1.5 py-0.5 text-xs"
                              />
                              <select
                                name="role"
                                defaultValue={user.role}
                                className="rounded border border-neutral-300 px-1 py-0.5 text-xs bg-white"
                              >
                                <option value="ingeniero">Ingeniero</option>
                                <option value="marketing">Marketing</option>
                              </select>
                              <input
                                type="hidden"
                                name="active"
                                value="true"
                              />
                              <SubmitButton
                                type="submit"
                                pendingText="Guardando..."
                                className="rounded bg-neutral-100 px-2 py-0.5 text-xs hover:bg-neutral-200"
                                title="Guardar"
                              >
                                Guardar
                              </SubmitButton>
                            </form>

                            {/* Desactivar */}
                            <form action={deactivateInternalUserAction}>
                              <input
                                type="hidden"
                                name="userId"
                                value={user.id}
                              />
                              <SubmitButton
                                type="submit"
                                pendingText="Desactivando..."
                                className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-700 hover:bg-red-100"
                              >
                                Desactivar
                              </SubmitButton>
                            </form>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400">
                            No editable
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
