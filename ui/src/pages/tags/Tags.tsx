import { useRef, useState, useCallback } from "react";
import { Button } from "@/common/Button";
import Modal from "@/common/Modal";
import AddTag, { AddTagHandle, AddTagFormValues } from "./AddTag";
import TagItem from "./TagItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/common/Card";
import { Plus } from "lucide-react";
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from "@/hooks/useTags";
import { usePermission } from "@/hooks/usePermission";
import { Tag } from "@/types/tag";

const Tags = () => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [activeTag, setActiveTag] = useState<Tag | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const formRef = useRef<AddTagHandle>(null);

  const { data: tags = [], isLoading, error } = useTags();
  const canEditTags = usePermission("TAG_EDIT");
  const createTagMutation = useCreateTag();
  const updateTagMutation = useUpdateTag();
  const deleteTagMutation = useDeleteTag();

  const isSaving = createTagMutation.isPending || updateTagMutation.isPending;
  const isRemoving = deleteTagMutation.isPending ? activeTag?.id ?? null : null;

  const resetModalState = useCallback(() => {
    setShowModal(false);
    setModalMode("add");
    setActiveTag(null);
    setSubmitError(null);
    formRef.current?.reset();
  }, []);

  const handleModalClose = useCallback(() => {
    if (isSaving) return;
    resetModalState();
  }, [isSaving, resetModalState]);

  const handleAddClick = useCallback(() => {
    setModalMode("add");
    setActiveTag(null);
    setShowModal(true);
  }, []);

  const handleEditTag = useCallback((tag: Tag) => {
    setModalMode("edit");
    setActiveTag(tag);
    setShowModal(true);
  }, []);

  const handleRemoveTag = useCallback((tag: Tag) => {
    setActiveTag(tag);
    setShowDeleteModal(true);
  }, []);

  const handleSaveTag = () => {
    formRef.current?.submit();
  };

  const handleTagFormSubmit = async (values: AddTagFormValues) => {
    try {
      setSubmitError(null);
      if (modalMode === "add") {
        await createTagMutation.mutateAsync(values);
      } else if (activeTag) {
        await updateTagMutation.mutateAsync({ ...activeTag, ...values });
      }
      resetModalState();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save tag";
      setSubmitError(message);
    }
  };

  const confirmDeleteTag = async () => {
    if (!activeTag) return;
    try {
      await deleteTagMutation.mutateAsync(activeTag.id);
      setShowDeleteModal(false);
      setActiveTag(null);
    } catch {
      setShowDeleteModal(false);
    }
  };

  if (isLoading) {
    return (
      <main className="container mx-auto p-6">
        <div className="text-center py-12 text-muted-foreground">Loading tags...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto p-6">
        <div className="text-center py-12 text-destructive">
          Error loading tags: {error.message}
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto p-6 max-w-3xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">Tags</CardTitle>
          {canEditTags && (
            <Button size="sm" onClick={handleAddClick}>
              <Plus className="h-4 w-4 mr-1" />
              Add Tag
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {tags.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No tags yet. Add one to get started.
            </p>
          ) : (
            tags.map((tag: Tag) => (
              <TagItem
                key={tag.id}
                {...tag}
                onEdit={handleEditTag}
                onRemove={handleRemoveTag}
                isRemoving={isRemoving === tag.id}
                canEdit={canEditTags}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Add / Edit modal */}
      <Modal
        title={modalMode === "add" ? "Add Tag" : "Edit Tag"}
        open={showModal}
        handleClose={handleModalClose}
        handleSave={handleSaveTag}
        saving={isSaving}
      >
        <AddTag
          ref={formRef}
          onSubmit={handleTagFormSubmit}
          isSubmitting={isSaving}
          submitError={submitError}
          initialValues={activeTag ?? undefined}
        />
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        title="Remove Tag"
        open={showDeleteModal}
        handleClose={() => setShowDeleteModal(false)}
        handleSave={confirmDeleteTag}
        saving={deleteTagMutation.isPending}
        saveLabel="Remove"
      >
        <p className="text-sm text-muted-foreground">
          Are you sure you want to remove{" "}
          <span className="font-semibold text-foreground">{activeTag?.name}</span>? This will also
          remove it from all associated courses.
        </p>
      </Modal>
    </main>
  );
};

export default Tags;
