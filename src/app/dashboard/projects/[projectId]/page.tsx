import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth/session";
import {
  canReadProject,
} from "@/lib/projects/permissions";
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
  listProjectComments,
  canCreateProjectComment,
  canEditProjectComment,
  canDeleteProjectComment,
} from "@/lib/projects/comments/queries";
import {
  createProjectCommentAction,
  editProjectCommentAction,
  deleteProjectCommentAction,
} from "@/lib/projects/comments/actions";
import {
  listProjectFiles,
  canUploadProjectFile,
  canDeleteProjectFile,
} from "@/lib/projects/files/queries";
import {
  uploadProjectFileAction,
  deleteProjectFileAction,
} from "@/lib/projects/files/actions";
import {
  canUploadUpdateFile,
  canDeleteUpdateFile,
} from "@/lib/projects/updates/files/queries";
import {
  uploadUpdateFileAction,
  deleteUpdateFileAction,
} from "@/lib/projects/updates/files/actions";
import { generateSignedUrl } from "@/lib/projects/storage";
import ProjectRealtimeListener from "@/components/realtime/project-realtime-listener";
import { InlineCommentEditor } from "@/components/comments/inline-comment-editor";
import { InlineUpdateEditor } from "@/components/updates/inline-update-editor";
import { FilePreview } from "@/components/files/file-preview";
import { SubmitButton } from "@/components/ui/submit-button";
import { ImageLightbox } from "@/components/files/image-lightbox";
import type { ImageItem } from "@/components/files/file-preview";

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
    "comment-created"?: string;
    "comment-edited"?: string;
    "comment-deleted"?: string;
    "file-uploaded"?: string;
    "file-deleted"?: string;
  }>;
}) {
  const { projectId } = await params;
  const sp = await searchParams;

  const profile = await getCurrentUserProfile();

  if (!profile || !profile.active) {
    redirect("/login?error=inactive");
  }

  const project = await getProjectById(projectId);
  if (!project || project.deletedAt) {
    notFound();
  }

  const canView = await canReadProject(profile, projectId);

  if (!canView) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p className="text-neutral-500">No tienes acceso a esta obra.</p>
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

  // Comentarios generales de obra
  const projectComments = await listProjectComments(projectId);
  const canAddProjectComment = await canCreateProjectComment(
    profile,
    projectId,
  );

  const projectCommentsWithPermissions = await Promise.all(
    projectComments.map(async (comment) => ({
      comment,
      canEdit: await canEditProjectComment(profile, comment.id),
      canDelete: await canDeleteProjectComment(profile, comment.id),
    })),
  );

  // Comentarios de actualizacion (cargar para cada update)
  const updatesWithComments = await Promise.all(
    updatesWithPermissions.map(async ({ update, canEdit, canDelete }) => {
      const updateComments = await listUpdateComments(update.id);
      const canAddComment = await canCreateUpdateComment(profile, update.id);

      const commentsWithPermissions = await Promise.all(
        updateComments.map(async (comment) => ({
          comment,
          canEdit: await canEditUpdateComment(profile, comment.id),
          canDelete: await canDeleteUpdateComment(profile, comment.id),
        })),
      );

      const canAddUpdateFile = await canUploadUpdateFile(
        profile,
        projectId,
      );

      const updateFilesWithUrls = await Promise.all(
        update.files.map(async (file) => ({
          file,
          signedUrl: await generateSignedUrl(file),
          canDelete: await canDeleteUpdateFile(profile, file.id),
        })),
      );

      const updateImageItems: ImageItem[] = updateFilesWithUrls
        .filter((f) => f.file.fileType === "foto" || f.file.fileType?.startsWith("image/"))
        .map((f) => ({
          src: f.signedUrl ?? "",
          alt: f.file.fileName,
          fileName: f.file.fileName,
        }));

      return {
        update,
        canEdit,
        canDelete,
        canAddComment,
        comments: commentsWithPermissions,
        canAddUpdateFile,
        updateFiles: updateFilesWithUrls,
        updateImageItems,
      };
    }),
  );

  // Archivos generales de obra
  const projectFiles = await listProjectFiles(projectId);
  const canUploadFile = await canUploadProjectFile(profile, projectId);

  const projectFilesWithUrls = await Promise.all(
    projectFiles.map(async (file) => ({
      file,
      signedUrl: await generateSignedUrl(file),
      canDelete: await canDeleteProjectFile(profile, file.id),
    })),
  );

  const projectImageItems: ImageItem[] = projectFilesWithUrls
    .filter((f) => f.file.fileType === "foto" || f.file.fileType?.startsWith("image/"))
    .map((f) => ({
      src: f.signedUrl ?? "",
      alt: f.file.fileName,
      fileName: f.file.fileName,
    }));

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
                        : project.currentStatus === "en_pausa"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-neutral-100 text-neutral-700"
                }`}
              >
                {project.currentStatus}
              </span>{" "}
              · {project.currentProgress}%
            </p>
          </div>
          <Link
            href={profile.role === "cliente" ? "/dashboard/client" : "/dashboard/projects"}
            className="text-sm text-neutral-500 underline hover:text-neutral-900"
          >
            {profile.role === "cliente" ? "Volver a mis obras" : "Volver a obras"}
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
        {sp["comment-created"] === "true" && (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">
            Comentario publicado.
          </p>
        )}
        {sp["comment-edited"] === "true" && (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">
            Comentario editado.
          </p>
        )}
        {sp["comment-deleted"] === "true" && (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">
            Comentario eliminado.
          </p>
        )}
        {sp["file-uploaded"] === "true" && (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">
            Archivo subido.
          </p>
        )}
        {sp["file-deleted"] === "true" && (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">
            Archivo eliminado.
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
                                <SubmitButton
                                  type="submit"
                                  pendingText="..."
                                  className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-100"
                                >
                                  Hacer principal
                                </SubmitButton>
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
                                <SubmitButton
                                  type="submit"
                                  pendingText="..."
                                  className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-700 hover:bg-red-100"
                                >
                                  Desasignar
                                </SubmitButton>
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
                <SubmitButton type="submit" pendingText="Asignando..." className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
                  Asignar
                </SubmitButton>
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
                <SubmitButton type="submit" pendingText="Asignando..." className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
                  Asignar
                </SubmitButton>
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
              <div className="space-y-1">
                <p className="text-xs font-medium text-neutral-500">
                  Evidencia del avance
                </p>
                <input
                  type="file"
                  name="files"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.pdf,.mp4,.webm,.mov"
                  className="w-full rounded border border-neutral-300 px-2 py-1 text-xs file:mr-2 file:rounded file:border-0 file:bg-neutral-100 file:px-1.5 file:py-0.5 file:text-xs file:font-medium file:text-neutral-700"
                />
                <p className="text-xs text-neutral-400">
                  Opcional: adjunta fotos, PDF o 1 video corto como evidencia de este avance. Maximo 25 MB para video.
                </p>
              </div>
              <SubmitButton
                type="submit"
                pendingText="Publicando actualizacion..."
                className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Publicar actualizacion
              </SubmitButton>
            </form>
          </section>
        )}

        {/* Documentos de obra */}
        <section className="space-y-4 rounded border border-neutral-200 p-4">
          <h2 className="font-medium">
            Documentos de obra ({projectFiles.length})
          </h2>

          {canUploadFile && (
            <form
              action={uploadProjectFileAction}
              className="flex items-end gap-2"
            >
              <input type="hidden" name="projectId" value={projectId} />
              <div className="flex-1 space-y-1">
                <input
                  type="file"
                  name="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  className="w-full rounded border border-neutral-300 px-3 py-1.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-neutral-100 file:px-2 file:py-1 file:text-xs file:font-medium file:text-neutral-700 hover:file:bg-neutral-200"
                  required
                />
                <p className="text-xs text-neutral-400">
                  Sube documentos generales de la obra: contratos, cartas, actas, planos, PDF o imagenes. Maximo 10 MB.
                </p>
              </div>
              <SubmitButton
                type="submit"
                pendingText="Subiendo documento..."
                className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 shrink-0"
              >
                Subir documento
              </SubmitButton>
            </form>
          )}

          {projectFilesWithUrls.length === 0 && !canUploadFile ? null : projectFilesWithUrls.length === 0 ? (
            <p className="text-sm text-neutral-400">
              Sin documentos.
            </p>
          ) : (
            <div className="space-y-1">
              {projectFilesWithUrls
                .filter((f) => f.file.fileType !== "foto" && !f.file.fileType?.startsWith("image/"))
                .map(({ file, signedUrl, canDelete }) => (
                  <FilePreview
                    key={file.id}
                    fileName={file.fileName}
                    signedUrl={signedUrl}
                    size={file.size}
                    fileType={file.fileType}
                    projectId={projectId}
                    fileId={file.id}
                  >
                    {canDelete && (
                      <form action={deleteProjectFileAction}>
                        <input type="hidden" name="fileId" value={file.id} />
                          <SubmitButton
                            type="submit"
                            pendingText="Eliminando..."
                            className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-700 hover:bg-red-100"
                          >
                            Eliminar
                          </SubmitButton>
                      </form>
                    )}
                  </FilePreview>
                ))}
              {projectImageItems.length > 0 && (
                <>
                  <p className="text-xs font-medium text-neutral-500 pt-2">Imagenes de obra</p>
                <ImageLightbox images={projectImageItems}>
                  {projectFilesWithUrls
                    .filter((f) => f.file.fileType === "foto" || f.file.fileType?.startsWith("image/"))
                    .map(({ file, canDelete }) =>
                      canDelete ? (
                        <form key={file.id} action={deleteProjectFileAction}>
                          <input type="hidden" name="fileId" value={file.id} />
                          <SubmitButton
                            type="submit"
                            pendingText="Eliminando..."
                            className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-700 hover:bg-red-100"
                          >
                            Eliminar
                          </SubmitButton>
                        </form>
                      ) : null
                    )}
                </ImageLightbox>
                </>
              )}
            </div>
          )}
        </section>

        {/* Comentarios generales de obra */}
        <section className="space-y-4 rounded border border-neutral-200 p-4">
          <h2 className="font-medium">
            Comentarios generales ({projectComments.length})
          </h2>

          {canAddProjectComment && (
            <form action={createProjectCommentAction} className="flex items-start gap-2">
              <input type="hidden" name="projectId" value={projectId} />
              <input
                name="content"
                type="text"
                placeholder="Escribe un comentario general..."
                maxLength={2000}
                required
                className="flex-1 rounded border border-neutral-300 px-2 py-1 text-xs"
              />
              <SubmitButton
                type="submit"
                pendingText="Enviando..."
                className="rounded bg-neutral-900 px-2 py-1 text-xs font-medium text-white hover:bg-neutral-800 shrink-0"
              >
                Enviar
              </SubmitButton>
            </form>
          )}

          {projectCommentsWithPermissions.length === 0 ? (
            <p className="text-sm text-neutral-400">
              Sin comentarios generales.
            </p>
          ) : (
            <div className="space-y-2">
              {projectCommentsWithPermissions.map(({ comment, canEdit, canDelete }) => (
                <div
                  key={comment.id}
                  className="rounded bg-neutral-50 p-2 space-y-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <InlineCommentEditor
                        commentId={comment.id}
                        initialContent={comment.content}
                        canEdit={canEdit}
                        editAction={editProjectCommentAction}
                      />
                      <p className="text-xs text-neutral-400 mt-1">
                        {comment.author.name}
                        {comment.author.role === "super_admin"
                          ? " (admin)"
                          : comment.author.role === "ingeniero"
                            ? " (ingeniero)"
                            : comment.author.role === "marketing"
                              ? " (marketing)"
                              : " (cliente)"}{" "}
                        · {new Date(comment.createdAt).toLocaleDateString()}
                        {comment.editedAt && " (editado)"}
                      </p>
                    </div>
                    {(canEdit || canDelete) && (
                      <div className="flex gap-1 shrink-0">
                        {canDelete && (
                          <form action={deleteProjectCommentAction}>
                            <input type="hidden" name="commentId" value={comment.id} />
                                    <SubmitButton
                                      type="submit"
                                      pendingText="Eliminando..."
                                      className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-700 hover:bg-red-100"
                                    >
                                      Eliminar
                                    </SubmitButton>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Lista de actualizaciones */}
        <section className="space-y-4">
          <h2 className="font-medium">Actualizaciones ({updates.length})</h2>
          {updates.length === 0 ? (
            <p className="text-sm text-neutral-400">
              Sin actualizaciones publicadas.
            </p>
          ) : (
            <div className="space-y-3">
              {updatesWithComments.map(({ update, canEdit, canDelete, canAddComment, comments, canAddUpdateFile, updateFiles, updateImageItems }) => (
                  <div
                    key={update.id}
                    id={`update-${update.id}`}
                    className="rounded border border-neutral-200 p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <InlineUpdateEditor
                          updateId={update.id}
                          initialTitle={update.title}
                          initialDescription={update.description}
                          canEdit={canEdit}
                          editAction={updateProjectUpdateAction}
                        />
                        <p className="text-xs text-neutral-400 mt-1">
                          {update.author.name} ·{" "}
                          {new Date(update.createdAt).toLocaleDateString()}
                          {update.editedAt && " (editado)"}
                        </p>
                      </div>
                      {(canEdit || canDelete) && (
                        <div className="flex gap-1 shrink-0">
                          {canDelete && (
                            <form action={deleteProjectUpdateAction}>
                              <input type="hidden" name="updateId" value={update.id} />
                              <SubmitButton
                                type="submit"
                                pendingText="Eliminando..."
                                className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-700 hover:bg-red-100"
                              >
                                Eliminar
                              </SubmitButton>
                            </form>
                          )}
                        </div>
                      )}
                    </div>
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
                    {updateFiles.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-neutral-500">Evidencia del avance</p>
                        {updateFiles
                          .filter((f) => f.file.fileType !== "foto" && !f.file.fileType?.startsWith("image/"))
                          .map(({ file, signedUrl, canDelete: canDeleteFile }) => (
                            <FilePreview
                              key={file.id}
                              fileName={file.fileName}
                              signedUrl={signedUrl}
                              size={file.size}
                              fileType={file.fileType}
                              projectId={projectId}
                              updateId={update.id}
                              fileId={file.id}
                            >
                              {canDeleteFile && (
                                <form action={deleteUpdateFileAction}>
                                  <input
                                    type="hidden"
                                    name="fileId"
                                    value={file.id}
                                  />
                                  <SubmitButton
                                    type="submit"
                                    pendingText="Eliminando..."
                                    className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-700 hover:bg-red-100"
                                  >
                                    Eliminar
                                  </SubmitButton>
                                </form>
                              )}
                            </FilePreview>
                          ))}
                        {updateImageItems.length > 0 && (
                          <ImageLightbox images={updateImageItems}>
                            {updateFiles
                              .filter((f) => f.file.fileType === "foto" || f.file.fileType?.startsWith("image/"))
                              .map(({ file, canDelete: canDeleteFile }) =>
                                canDeleteFile ? (
                                  <form key={file.id} action={deleteUpdateFileAction}>
                                    <input
                                      type="hidden"
                                      name="fileId"
                                      value={file.id}
                                    />
                                  <SubmitButton
                                    type="submit"
                                    pendingText="Eliminando..."
                                    className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-700 hover:bg-red-100"
                                  >
                                    Eliminar
                                  </SubmitButton>
                                  </form>
                                ) : null
                              )}
                          </ImageLightbox>
                        )}
                      </div>
                    )}

                    {/* Formulario de subida de archivo en actualizacion */}
                    {canAddUpdateFile && (
                      <div className="border-t border-neutral-100 pt-2">
                        <form
                          action={uploadUpdateFileAction}
                          className="flex items-end gap-2"
                        >
                          <input
                            type="hidden"
                            name="updateId"
                            value={update.id}
                          />
                          <input
                            type="hidden"
                            name="projectId"
                            value={projectId}
                          />
                          <div className="flex-1 space-y-1">
                            <input
                              type="file"
                              name="file"
                              accept=".jpg,.jpeg,.png,.webp,.mp4,.webm,.mov,.pdf"
                              className="w-full rounded border border-neutral-300 px-2 py-1 text-xs file:mr-2 file:rounded file:border-0 file:bg-neutral-100 file:px-1.5 file:py-0.5 file:text-xs file:font-medium file:text-neutral-700"
                            />
                            <p className="text-xs text-neutral-400">
                              Adjunta evidencia para este avance: fotos, PDF o 1 video corto. Video maximo 25 MB.
                            </p>
                          </div>
                          <SubmitButton
                            type="submit"
                            pendingText="Subiendo evidencia..."
                            className="rounded bg-neutral-900 px-2 py-1 text-xs font-medium text-white hover:bg-neutral-800 shrink-0"
                          >
                            Subir evidencia
                          </SubmitButton>
                        </form>
                      </div>
                    )}

                    {/* Comentarios de actualizacion */}
                    {comments.length > 0 && (
                      <div className="border-t border-neutral-100 pt-2 mt-2 space-y-2">
                        <p className="text-xs font-medium text-neutral-500">
                          Comentarios ({comments.length})
                        </p>
                        {comments.map(({ comment, canEdit: canEditComment, canDelete: canDeleteComment }) => (
                          <div
                            key={comment.id}
                            className="rounded bg-neutral-50 p-2 space-y-1"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <InlineCommentEditor
                                  commentId={comment.id}
                                  initialContent={comment.content}
                                  canEdit={canEditComment}
                                  editAction={editUpdateCommentAction}
                                />
                                <p className="text-xs text-neutral-400 mt-1">
                                  {comment.author.name}
                                  {comment.author.role === "super_admin"
                                    ? " (admin)"
                                    : comment.author.role === "ingeniero"
                                      ? " (ingeniero)"
                                      : comment.author.role === "marketing"
                                        ? " (marketing)"
                                        : " (cliente)"}{" "}
                                  · {new Date(comment.createdAt).toLocaleDateString()}
                                  {comment.editedAt && " (editado)"}
                                </p>
                              </div>
                              {(canEditComment || canDeleteComment) && (
                                <div className="flex gap-1 shrink-0">
                                  {canDeleteComment && (
                                    <form action={deleteUpdateCommentAction}>
                                      <input type="hidden" name="commentId" value={comment.id} />
                                      <SubmitButton
                                        type="submit"
                                        pendingText="Eliminando..."
                                        className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-700 hover:bg-red-100"
                                      >
                                        Eliminar
                                      </SubmitButton>
                                    </form>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Formulario de comentario en actualizacion */}
                    {canAddComment && (
                      <div className="border-t border-neutral-100 pt-2 mt-2">
                        <form action={createUpdateCommentAction} className="flex items-start gap-2">
                          <input type="hidden" name="updateId" value={update.id} />
                          <input
                            name="content"
                            type="text"
                            placeholder="Escribe un comentario..."
                            maxLength={2000}
                            required
                            className="flex-1 rounded border border-neutral-300 px-2 py-1 text-xs"
                          />
                          <SubmitButton
                            type="submit"
                            pendingText="Enviando..."
                            className="rounded bg-neutral-900 px-2 py-1 text-xs font-medium text-white hover:bg-neutral-800 shrink-0"
                          >
                            Enviar
                          </SubmitButton>
                        </form>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>
      <ProjectRealtimeListener
        projectIds={[projectId]}
        updateIds={updates.map((u) => u.id)}
      />
    </main>
  );
}
