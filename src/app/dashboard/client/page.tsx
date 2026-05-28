import { redirect } from "next/navigation";
import { requireAnyRole } from "@/lib/auth/guards";
import { signOutAction } from "@/lib/auth/actions";
import { getClientByUserId } from "@/lib/clients/queries";
import { listClientProjects } from "@/lib/projects/queries";
import {
  listUpdateComments,
  canCreateUpdateComment,
  canEditUpdateComment,
  canDeleteUpdateComment,
} from "@/lib/projects/updates/comments/queries";
import {
  createUpdateCommentAction,
  editUpdateCommentAction,
  deleteUpdateCommentAction,
} from "@/lib/projects/updates/comments/actions";
import {
  canCreateProjectComment,
  canEditProjectComment,
  canDeleteProjectComment,
} from "@/lib/projects/comments/queries";
import {
  createProjectCommentAction,
  editProjectCommentAction,
  deleteProjectCommentAction,
} from "@/lib/projects/comments/actions";
import { generateSignedUrl } from "@/lib/projects/storage";
import ProjectRealtimeListener from "@/components/realtime/project-realtime-listener";
import { InlineCommentEditor } from "@/components/comments/inline-comment-editor";
import { FilePreview } from "@/components/files/file-preview";

export default async function ClientDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    "comment-created"?: string;
    "comment-deleted"?: string;
  }>;
}) {
  const profile = await requireAnyRole(["super_admin", "cliente"]);

  if (profile.role === "super_admin") {
    redirect("/dashboard/admin");
  }

  const params = await searchParams;

  const client = await getClientByUserId(profile.id);

  if (!client) {
    return (
      <main className="flex min-h-screen flex-col items-center p-8">
        <div className="w-full max-w-2xl space-y-8">
          <div>
            <h1 className="text-2xl font-bold">{profile.name}</h1>
            <p className="text-neutral-500">No se encontro informacion de cliente asociada a tu cuenta.</p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
            >
              Cerrar sesion
            </button>
          </form>
        </div>
      </main>
    );
  }

  const projects = await listClientProjects(client.id);

  const activeCount = projects.filter(
    (p) => p.currentStatus !== "completado" && p.currentStatus !== "cancelado",
  ).length;
  const completedCount = projects.filter(
    (p) => p.currentStatus === "completado" || p.currentStatus === "cancelado",
  ).length;

  const returnTo = "/dashboard/client";

  // Precomputar permisos de comentarios generales y archivos
  const projectsWithGeneralPerms = await Promise.all(
    projects.map(async (project) => ({
      project,
      canAddGeneralComment: await canCreateProjectComment(profile, project.id),
      projectFilesWithUrls: await Promise.all(
        project.files.map(async (file) => ({
          file,
          signedUrl: await generateSignedUrl(file.url),
        })),
      ),
    })),
  );

  // Precomputar permisos de actualizaciones y comentarios
  const projectsWithDetails = await Promise.all(
    projectsWithGeneralPerms.map(async ({ project, canAddGeneralComment, projectFilesWithUrls }) => {
      const updatesWithPerms = await Promise.all(
        project.updates.map(async (update) => {
          const canAddUpdateComment = await canCreateUpdateComment(
            profile,
            update.id,
          );
          const updateComments = await listUpdateComments(update.id);
          const commentsWithPerms = await Promise.all(
            updateComments.map(async (comment) => ({
              comment,
              canEdit: await canEditUpdateComment(profile, comment.id),
              canDelete: await canDeleteUpdateComment(profile, comment.id),
            })),
          );

          const updateFilesWithUrls = await Promise.all(
            update.files.map(async (file) => ({
              file,
              signedUrl: await generateSignedUrl(file.url),
            })),
          );

          return {
            update,
            canAddUpdateComment,
            comments: commentsWithPerms,
            updateFiles: updateFilesWithUrls,
          };
        }),
      );

      const generalCommentsWithPerms = await Promise.all(
        project.comments.map(async (comment) => ({
          comment,
          canEdit: await canEditProjectComment(profile, comment.id),
          canDelete: await canDeleteProjectComment(profile, comment.id),
        })),
      );

      return {
        project,
        canAddGeneralComment,
        updates: updatesWithPerms,
        generalComments: generalCommentsWithPerms,
        projectFiles: projectFilesWithUrls,
      };
    }),
  );

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mis obras</h1>
            <p className="text-sm text-neutral-500">
              Bienvenido, {client.displayName}
            </p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
            >
              Cerrar sesion
            </button>
          </form>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded border border-neutral-200 p-4">
            <p className="text-2xl font-bold">{activeCount}</p>
            <p className="text-sm text-neutral-500">Obras activas</p>
          </div>
          <div className="rounded border border-neutral-200 p-4">
            <p className="text-2xl font-bold">{completedCount}</p>
            <p className="text-sm text-neutral-500">
              Completadas / canceladas
            </p>
          </div>
        </div>

        {/* Mensajes de feedback */}
        {params.error && (
          <p className="rounded bg-red-50 p-3 text-sm text-red-800">
            {decodeURIComponent(params.error)}
          </p>
        )}
        {params["comment-created"] === "true" && (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">
            Comentario publicado.
          </p>
        )}
        {params["comment-deleted"] === "true" && (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">
            Comentario eliminado.
          </p>
        )}

        {/* Lista de obras */}
        {projectsWithDetails.length === 0 ? (
          <p className="text-sm text-neutral-400">
            No tienes obras registradas.
          </p>
        ) : (
          <div className="space-y-6">
            {projectsWithDetails.map(
              ({
                project,
                canAddGeneralComment,
                updates,
                generalComments,
                projectFiles,
              }) => {
                return (
                  <section
                    key={project.id}
                    className="rounded border border-neutral-200 p-6 space-y-6"
                  >
                    {/* Encabezado de obra */}
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <h2 className="text-lg font-bold">{project.name}</h2>
                          {project.description && (
                            <p className="text-sm text-neutral-500">
                              {project.description}
                            </p>
                          )}
                        </div>
                        <span
                          className={`rounded px-2 py-1 text-xs font-medium shrink-0 ${
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
                          {project.currentStatus === "planeacion"
                            ? "En planeacion"
                            : project.currentStatus === "en_progreso"
                              ? "En progreso"
                              : project.currentStatus === "en_pausa"
                                ? "En pausa"
                                : project.currentStatus === "completado"
                                  ? "Completado"
                                  : "Cancelado"}
                        </span>
                      </div>

                      {/* Progreso */}
                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-2 flex-1 rounded-full bg-neutral-200">
                          <div
                            className="h-full rounded-full bg-neutral-700 transition-all"
                            style={{
                              width: `${project.currentProgress}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium text-neutral-600">
                          {project.currentProgress}%
                        </span>
                      </div>

                      {/* Fechas */}
                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-neutral-400">
                        {project.startDate && (
                          <span>
                            Inicio:{" "}
                            {new Date(project.startDate).toLocaleDateString()}
                          </span>
                        )}
                        {project.estimatedEndDate && (
                          <span>
                            Fin estimado:{" "}
                            {new Date(
                              project.estimatedEndDate,
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Equipo asignado */}
                    {project.assignments.length > 0 && (
                      <div className="border-t border-neutral-100 pt-4">
                        <p className="text-xs font-medium text-neutral-500 mb-2">
                          Equipo asignado
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {project.assignments.map((a) => (
                            <span
                              key={a.id}
                              className="rounded bg-neutral-100 px-2 py-1 text-xs"
                            >
                              {a.user.name}
                              {a.isPrincipal && a.role === "ingeniero"
                                ? " (ing. principal)"
                                : a.role === "ingeniero"
                                  ? " (ingeniero)"
                                  : " (marketing)"}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Archivos de obra */}
                    {projectFiles.length > 0 && (
                      <div className="border-t border-neutral-100 pt-4">
                        <p className="text-xs font-medium text-neutral-500 mb-2">
                          Archivos ({projectFiles.length})
                        </p>
                        <div className="space-y-1">
                          {projectFiles.map(({ file, signedUrl }) => (
                            <FilePreview
                              key={file.id}
                              fileName={file.fileName}
                              signedUrl={signedUrl}
                              size={file.size}
                              fileType={file.fileType}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actualizaciones */}
                    {updates.length > 0 && (
                      <div className="border-t border-neutral-100 pt-4 space-y-4">
                        <p className="text-sm font-medium">
                          Avances ({updates.length})
                        </p>
                        {updates.map(
                          ({ update, canAddUpdateComment, comments, updateFiles }) => (
                            <div
                              key={update.id}
                              className="rounded border border-neutral-100 p-3 space-y-2"
                            >
                              <div>
                                <h3 className="font-medium text-sm">
                                  {update.title}
                                </h3>
                                <p className="text-xs text-neutral-400">
                                  {update.author.name} ·{" "}
                                  {new Date(
                                    update.createdAt,
                                  ).toLocaleDateString()}
                                  {update.editedAt && " (editado)"}
                                </p>
                              </div>
                              {update.description && (
                                <p className="text-sm text-neutral-600">
                                  {update.description}
                                </p>
                              )}
                              {(update.resultingStatus ||
                                update.resultingProgress !== null) && (
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
                              {updateFiles.length > 0 && (
                                <div className="space-y-1">
                                  {updateFiles.map(({ file, signedUrl }) => (
                                    <FilePreview
                                      key={file.id}
                                      fileName={file.fileName}
                                      signedUrl={signedUrl}
                                      size={file.size}
                                    />
                                  ))}
                                </div>
                              )}

                              {/* Comentarios de actualizacion */}
                              {comments.length > 0 && (
                                <div className="border-t border-neutral-100 pt-2 space-y-1.5">
                                  {comments.map(
                                    ({ comment, canEdit, canDelete }) => (
                                      <div
                                        key={comment.id}
                                        className="flex items-start justify-between gap-2"
                                      >
                                        <div className="flex-1 min-w-0">
                                          <InlineCommentEditor
                                            commentId={comment.id}
                                            initialContent={comment.content}
                                            canEdit={canEdit}
                                            editAction={editUpdateCommentAction}
                                            returnTo={returnTo}
                                          />
                                          <p className="text-xs text-neutral-400 mt-0.5">
                                            {comment.author.name ===
                                            profile.name
                                              ? "Tu"
                                              : comment.author.name}{" "}
                                            ·{" "}
                                            {new Date(
                                              comment.createdAt,
                                            ).toLocaleDateString()}
                                            {comment.editedAt && " (editado)"}
                                          </p>
                                        </div>
                                        {canDelete && (
                                          <form
                                            action={deleteUpdateCommentAction}
                                          >
                                            <input
                                              type="hidden"
                                              name="commentId"
                                              value={comment.id}
                                            />
                                            <input
                                              type="hidden"
                                              name="returnTo"
                                              value={returnTo}
                                            />
                                            <button
                                              type="submit"
                                              className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-700 hover:bg-red-100 shrink-0"
                                            >
                                              Eliminar
                                            </button>
                                          </form>
                                        )}
                                      </div>
                                    ),
                                  )}
                                </div>
                              )}

                              {/* Formulario de comentario en actualizacion */}
                              {canAddUpdateComment && (
                                <div className="border-t border-neutral-100 pt-2">
                                  <form
                                    action={createUpdateCommentAction}
                                    className="flex items-start gap-2"
                                  >
                                    <input
                                      type="hidden"
                                      name="updateId"
                                      value={update.id}
                                    />
                                    <input
                                      type="hidden"
                                      name="returnTo"
                                      value={returnTo}
                                    />
                                    <input
                                      name="content"
                                      type="text"
                                      placeholder="Escribe un comentario..."
                                      maxLength={2000}
                                      required
                                      className="flex-1 rounded border border-neutral-300 px-2 py-1 text-xs"
                                    />
                                    <button
                                      type="submit"
                                      className="rounded bg-neutral-900 px-2 py-1 text-xs font-medium text-white hover:bg-neutral-800 shrink-0"
                                    >
                                      Enviar
                                    </button>
                                  </form>
                                </div>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    )}

                    {/* Comentarios generales */}
                    <div className="border-t border-neutral-100 pt-4 space-y-3">
                      <p className="text-sm font-medium">
                        Comentarios ({generalComments.length})
                      </p>

                      {generalComments.length > 0 ? (
                        <div className="space-y-2">
                          {generalComments.map(
                            ({ comment, canEdit, canDelete }) => (
                              <div
                                key={comment.id}
                                className="flex items-start justify-between gap-2"
                              >
                                <div className="flex-1 min-w-0">
                                  <InlineCommentEditor
                                    commentId={comment.id}
                                    initialContent={comment.content}
                                    canEdit={canEdit}
                                    editAction={editProjectCommentAction}
                                    returnTo={returnTo}
                                  />
                                  <p className="text-xs text-neutral-400 mt-0.5">
                                    {comment.author.name === profile.name
                                      ? "Tu"
                                      : comment.author.name}{" "}
                                    ·{" "}
                                    {new Date(
                                      comment.createdAt,
                                    ).toLocaleDateString()}
                                    {comment.editedAt && " (editado)"}
                                  </p>
                                </div>
                                {canDelete && (
                                  <form action={deleteProjectCommentAction}>
                                    <input
                                      type="hidden"
                                      name="commentId"
                                      value={comment.id}
                                    />
                                    <input
                                      type="hidden"
                                      name="returnTo"
                                      value={returnTo}
                                    />
                                    <button
                                      type="submit"
                                      className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-700 hover:bg-red-100 shrink-0"
                                    >
                                      Eliminar
                                    </button>
                                  </form>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-neutral-400">
                          Sin comentarios.
                        </p>
                      )}

                      {/* Formulario de comentario general */}
                      {canAddGeneralComment && (
                        <form
                          action={createProjectCommentAction}
                          className="flex items-start gap-2"
                        >
                          <input
                            type="hidden"
                            name="projectId"
                            value={project.id}
                          />
                          <input
                            type="hidden"
                            name="returnTo"
                            value={returnTo}
                          />
                          <input
                            name="content"
                            type="text"
                            placeholder="Escribe un comentario general..."
                            maxLength={2000}
                            required
                            className="flex-1 rounded border border-neutral-300 px-2 py-1 text-xs"
                          />
                          <button
                            type="submit"
                            className="rounded bg-neutral-900 px-2 py-1 text-xs font-medium text-white hover:bg-neutral-800 shrink-0"
                          >
                            Enviar
                          </button>
                        </form>
                      )}
                    </div>
                  </section>
                );
              },
            )}
          </div>
          )}
      </div>
      <ProjectRealtimeListener
        projectIds={projectsWithDetails.map((p) => p.project.id)}
        updateIds={projectsWithDetails.flatMap((p) =>
          p.updates.map((u) => u.update.id),
        )}
      />
    </main>
  );
}
