import Link from "next/link";
import { requireAnyRole } from "@/lib/auth/guards";
import { listClients } from "@/lib/clients/queries";
import {
  createClientAction,
  updateClientAction,
  deactivateClientAction,
} from "@/lib/clients/actions";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    created?: string;
    updated?: string;
    deactivated?: string;
  }>;
}) {
  const profile = await requireAnyRole([
    "super_admin",
    "ingeniero",
    "marketing",
  ]);

  const canWrite =
    profile.role === "super_admin" || profile.role === "ingeniero";

  const clients = await listClients(profile.role === "marketing");
  const params = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-4xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Clientes</h1>
            <p className="text-sm text-neutral-500">
              {canWrite
                ? "Gestion de clientes"
                : "Visualizacion de clientes"}
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
            Cliente creado.
          </p>
        )}
        {params.updated === "true" && (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">
            Cliente actualizado.
          </p>
        )}
        {params.deactivated === "true" && (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">
            Cliente desactivado.
          </p>
        )}

        {/* Formulario de creacion (solo escritura) */}
        {canWrite && (
          <section className="rounded border border-neutral-200 p-4 space-y-4">
            <h2 className="font-medium">Crear cliente</h2>
            <form
              action={createClientAction}
              className="grid grid-cols-2 gap-3"
            >
              <input
                name="displayName"
                type="text"
                placeholder="Nombre del cliente"
                required
                className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
              />
              <select
                name="clientType"
                required
                defaultValue=""
                className="rounded border border-neutral-300 px-3 py-1.5 text-sm bg-white"
              >
                <option value="" disabled>
                  Tipo de cliente
                </option>
                <option value="persona">Persona</option>
                <option value="empresa">Empresa</option>
              </select>
              <input
                name="phone"
                type="text"
                placeholder="Telefono (opcional)"
                maxLength={10}
                className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
              />
              <input
                name="document"
                type="text"
                placeholder="Documento (opcional)"
                maxLength={10}
                className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
              />
              <input
                name="address"
                type="text"
                placeholder="Direccion (opcional)"
                className="col-span-2 rounded border border-neutral-300 px-3 py-1.5 text-sm"
              />
              <div className="col-span-2 border-t border-neutral-100 pt-3 mt-1">
                <p className="text-xs font-medium text-neutral-500 mb-2">
                  Cuenta de acceso del cliente
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    name="name"
                    type="text"
                    placeholder="Nombre de usuario"
                    required
                    className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
                  />
                  <input
                    name="email"
                    type="email"
                    placeholder="Email de acceso"
                    required
                    className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
                  />
                  <input
                    name="password"
                    type="password"
                    placeholder="Contrasena temporal"
                    required
                    className="col-span-2 rounded border border-neutral-300 px-3 py-1.5 text-sm"
                  />
                </div>
              </div>
              <SubmitButton
                type="submit"
                pendingText="Creando..."
                className="col-span-2 rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Crear cliente
              </SubmitButton>
            </form>
          </section>
        )}

        {/* Tabla de clientes */}
        <section className="space-y-2">
          <h2 className="font-medium">
            Lista de clientes ({clients.length})
          </h2>
          {clients.length === 0 ? (
            <p className="text-sm text-neutral-400">
              No hay clientes registrados.
            </p>
          ) : (
            <div className="overflow-x-auto rounded border border-neutral-200">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Nombre</th>
                    <th className="px-3 py-2 font-medium">Tipo</th>
                    <th className="px-3 py-2 font-medium">Documento</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Estado</th>
                    {canWrite && (
                      <th className="px-3 py-2 font-medium">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {clients.map((client) => (
                    <tr key={client.id}>
                      <td className="px-3 py-2">{client.displayName}</td>
                      <td className="px-3 py-2">
                        <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs">
                          {client.clientType}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-neutral-500">
                        {client.document ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-neutral-500">
                        {client.user.email}
                      </td>
                      <td className="px-3 py-2">
                        {client.user.active ? (
                          <span className="text-green-700">Activo</span>
                        ) : (
                          <span className="text-red-600">Inactivo</span>
                        )}
                      </td>
                      {canWrite && (
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            {/* Edicion inline */}
                            <form
                              action={updateClientAction}
                              className="flex items-center gap-1"
                            >
                              <input
                                type="hidden"
                                name="clientId"
                                value={client.id}
                              />
                              <input
                                type="hidden"
                                name="phone"
                                value={client.phone ?? ""}
                              />
                              <input
                                type="hidden"
                                name="document"
                                value={client.document ?? ""}
                              />
                              <input
                                type="hidden"
                                name="address"
                                value={client.address ?? ""}
                              />
                              <input
                                name="displayName"
                                defaultValue={client.displayName}
                                className="w-28 rounded border border-neutral-300 px-1.5 py-0.5 text-xs"
                              />
                              <select
                                name="clientType"
                                defaultValue={client.clientType}
                                className="rounded border border-neutral-300 px-1 py-0.5 text-xs bg-white"
                              >
                                <option value="persona">Persona</option>
                                <option value="empresa">Empresa</option>
                              </select>
                              <SubmitButton
                                type="submit"
                                pendingText="Guardando..."
                                className="rounded bg-neutral-100 px-2 py-0.5 text-xs hover:bg-neutral-200"
                              >
                                Guardar
                              </SubmitButton>
                            </form>
                            {/* Desactivar */}
                            <form action={deactivateClientAction}>
                              <input
                                type="hidden"
                                name="clientId"
                                value={client.id}
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
                        </td>
                      )}
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
